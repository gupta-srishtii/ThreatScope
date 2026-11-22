"""Request size and origin enforcement before parsing any uploaded body."""

from collections import defaultdict, deque
from time import monotonic

from starlette.responses import JSONResponse

from threatscope.ingestion import MAX_UPLOAD_BYTES


class RequestGuard:
    def __init__(self, app, origins: list[str], max_body: int = MAX_UPLOAD_BYTES + 65536):
        self.app, self.origins, self.max_body = app, origins, max_body
        self.requests = defaultdict(deque)
        self.all_requests = defaultdict(deque)

    def allow_request(self, address, now, *, writes=False):
        store = self.requests if writes else self.all_requests
        if address not in store and len(store) >= 4096:
            expired = [key for key, queue in store.items() if not queue or queue[-1] <= now - 60]
            for key in expired:
                del store[key]
            if len(store) >= 4096:
                return False
        queue = store[address]
        while queue and queue[0] <= now - 60:
            queue.popleft()
        if len(queue) >= (60 if writes else 240):
            return False
        queue.append(now)
        return True

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        headers = dict(scope["headers"])
        method = scope["method"]

        async def reject(status, message):
            extra = {
                "X-Content-Type-Options": "nosniff",
                "Cache-Control": "no-store",
                "Referrer-Policy": "no-referrer",
                "X-Frame-Options": "DENY",
            }
            if status == 429:
                extra["Retry-After"] = "60"
            await JSONResponse({"detail": message}, status_code=status, headers=extra)(scope, receive, send)

        address = (scope.get("client") or ("unknown",))[0]
        now = monotonic()
        if scope["path"].startswith("/api/") and scope["path"] != "/api/health":
            if not self.allow_request(address, now):
                return await reject(429, "Request rate limit exceeded; retry in one minute")

        if method in ("POST", "PATCH", "DELETE"):
            origin = headers.get(b"origin", b"").decode("latin1")
            if origin and origin not in self.origins:
                return await reject(403, "Request origin is not allowed")
            # Single-process limiter, independent of spoofable forwarded headers.
            if not self.allow_request(address, now, writes=True):
                return await reject(429, "Write rate limit exceeded; retry in one minute")
        try:
            length = int(headers.get(b"content-length", b"0"))
            if length < 0:
                return await reject(400, "Invalid content length")
        except ValueError:
            return await reject(400, "Invalid content length")
        if length > self.max_body:
            return await reject(413, "Request exceeds the upload size limit")
        if method in ("POST", "PUT", "PATCH"):
            body = bytearray()
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    return
                body.extend(message.get("body", b""))
                if len(body) > self.max_body:
                    return await reject(413, "Request exceeds the upload size limit")
                if not message.get("more_body", False):
                    break
            consumed = False

            async def replay():
                nonlocal consumed
                if not consumed:
                    consumed = True
                    return {"type": "http.request", "body": bytes(body), "more_body": False}
                return await receive()

            await self.app(scope, replay, send)
        else:
            await self.app(scope, receive, send)
