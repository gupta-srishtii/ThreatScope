import path from 'node:path'
import { fileURLToPath } from 'node:url'
const repository = fileURLToPath(new URL('../../../', import.meta.url))
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'

const headers = { 'X-API-Key': 'synthetic-e2e-workspace-key' }
async function seed(request: APIRequestContext, scenario = 'mixed') {
  const response = await request.post('http://127.0.0.1:8001/api/datasets/scenario', {
    headers,
    data: { scenario },
  })
  expect(response.status()).toBe(201)
  return response.json()
}
async function connect(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Workspace connection', exact: true }).click()
  await page.getByLabel('Workspace API key').fill(headers['X-API-Key'])
  await page.getByRole('button', { name: 'Connect workspace', exact: true }).click()
}
async function navigate(page: Page, name: string) {
  const toggle = page.getByRole('button', { name: 'Open navigation' })
  if (await toggle.isVisible()) await toggle.click()
  await page.getByRole('navigation').getByRole('button', { name, exact: true }).click()
}

test('launches the synthetic workspace and explores chart series', async ({ page }) => {
  await connect(page)
  await page.getByRole('button', { name: 'Launch demo workspace' }).click()
  await expect(page.getByLabel('Security metrics')).toContainText('527')
  await page.getByRole('button', { name: 'Rule matches', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Rule matches', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByText('View timeline data', { exact: true }).click()
  await expect(page.getByRole('table', { name: 'Event activity by UTC bucket' })).toBeVisible()
})

test('investigates evidence, persists notes and exports the reviewed report', async ({
  page,
  request,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seed(request)
  await connect(page)
  await expect(page.getByLabel('Security metrics')).toContainText('527')
  await page.screenshot({ path: path.join(repository, '.logs/overview.png'), fullPage: true })
  await navigate(page, 'Detections')
  await page
    .getByRole('button', {
      name: 'Investigate Successful login after repeated failures',
      exact: true,
    })
    .click()
  const dialog = page.getByRole('dialog', {
    name: 'Successful login after repeated failures',
    exact: true,
  })
  await expect(dialog.getByText('Why this was detected')).toBeVisible()
  await expect(
    dialog.getByRole('table', { name: 'Events supporting this detection' }),
  ).toBeVisible()
  await dialog.getByLabel('Investigation status').selectOption('investigating')
  await dialog.getByRole('button', { name: 'Update status' }).click()
  await expect(dialog.getByRole('status')).toContainText('Investigation status updated.')
  await dialog
    .getByLabel('Add investigation note')
    .fill('Synthetic session reviewed with account owner; verify MFA next.')
  await dialog.getByRole('button', { name: 'Save note' }).click()
  await expect(
    dialog.getByText('Synthetic session reviewed with account owner; verify MFA next.', {
      exact: true,
    }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await navigate(page, 'Reports')
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download JSON report' }).click()
  const download = await downloading
  const report = JSON.parse(await readFile((await download.path())!, 'utf8'))
  expect(report.notes[0].body).toContain('verify MFA next')
  expect(report.alerts.find((a: { rule_id: string }) => a.rule_id === 'AUTH-002').status).toBe(
    'investigating',
  )
  expect(report.metrics.total_events).toBe(527)
})

test('searches and filters events and inspects normalized content', async ({ page, request }) => {
  await seed(request)
  await connect(page)
  await navigate(page, 'Events')
  await page.getByLabel('Search events').fill('198.51.100.42')
  await page.getByLabel('Event outcome').selectOption('failure')
  await expect(page.getByRole('status', { name: 'Event query results' })).toContainText(
    '9 matching events',
  )
  await page
    .getByRole('button', { name: /^Inspect event/ })
    .first()
    .click()
  const dialog = page.getByRole('dialog', { name: 'Event investigation' })
  await expect(dialog.getByText('Synthetic failed authentication', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await page.getByLabel('Search events').fill('no-matching-event')
  await expect(page.getByText('No matching events', { exact: true })).toBeVisible()
})

test('rejects malformed uploads and imports a valid authorized sample', async ({
  page,
  request,
}) => {
  await seed(request)
  await connect(page)
  await page.getByRole('button', { name: 'Import events', exact: true }).click()
  await page.getByRole('button', { name: 'Upload file', exact: true }).click()
  await page
    .getByLabel('Event file')
    .setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('[{}]') })
  await page.getByRole('button', { name: 'Validate and import' }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Row 1')
  const events = [
    {
      id: 'local-sample-1',
      timestamp: '2026-11-20T12:00:00Z',
      source_ip: '192.0.2.10',
      user: 'demo',
      host: 'demo-host',
      action: 'login',
      outcome: 'success',
    },
  ]
  await page.getByLabel('Event file').setInputFiles({
    name: 'authorized.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(events)),
  })
  await page.getByRole('button', { name: 'Validate and import' }).click()
  await expect(page.getByText('Imported dataset', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Security metrics')).toContainText('Events analyzed')
})

test('runs optional ML analysis and displays measured limitations', async ({ page, request }) => {
  await seed(request)
  await connect(page)
  await navigate(page, 'Anomaly lab')
  await expect(page.getByRole('heading', { name: 'Measured model evidence' })).toBeVisible()
  await expect(page.getByText('25.3', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Run anomaly analysis', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Anomaly candidates/ })).toBeVisible()
  await expect(page.getByText(/Anomaly scores measure unusualness/)).toBeVisible()
})

test('supports reduced motion, mobile layout and accessible dialogs', async ({ page, request }) => {
  await seed(request)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await connect(page)
  await expect(page.getByLabel('Security metrics')).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(overflow).toBe(false)
  const overviewAudit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(overviewAudit.violations).toEqual([])
  const menu = page.getByRole('button', { name: 'Open navigation' })
  await menu.click()
  await expect(page.getByRole('dialog', { name: 'Workspace navigation' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toBeFocused()
  await navigate(page, 'Detections')
  await page
    .getByRole('button', {
      name: 'Investigate Successful login after repeated failures',
      exact: true,
    })
    .click()
  const dialog = page.getByRole('dialog', {
    name: 'Successful login after repeated failures',
    exact: true,
  })
  await expect(dialog.getByLabel('Add investigation note')).toBeVisible()
  const dialogAudit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(dialogAudit.violations).toEqual([])
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(
    page.getByRole('button', {
      name: 'Investigate Successful login after repeated failures',
      exact: true,
    }),
  ).toBeFocused()
  await page.screenshot({ path: path.join(repository, '.logs/mobile.png'), fullPage: true })
})
