# Security documentation

The [root security policy](../../SECURITY.md) is the canonical policy and reporting entry point. No duplicate policy is maintained here.

See the [event contract](../development/EVENT_SCHEMA.md) for upload limits and normalization, [detection catalog](../detection/README.md) for coverage boundaries, [ML methodology](../ml/README.md) for label provenance/limitations and [deployment runbook](../deployment/README.md) for keys, CORS, persistence and operations.

The refactor preserves authorization, dataset scope, strict validation, bounded request processing, CSV formula protection, and all security regression tests. Generated data, model artifacts and local secrets remain ignored.
