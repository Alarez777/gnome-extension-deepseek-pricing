// SPDX-License-Identifier: GPL-2.0-or-later

// Smoke test for gnome-shell-test-tool. It is not a unit test: it runs inside
// a real (headless) GNOME Shell process and checks that the extension loads,
// builds its panel button and can be disabled and enabled again.

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';

const UUID = 'deepseek-pricing@alarez777.github.io';
// ExtensionState.ACTIVE has the same value in GNOME Shell 48-51.
const ACTIVE = 1;
const WAIT_TIMEOUT_MS = 10_000;
const STEP_TIMEOUT_MS = 2_000;

const failures = [];

function check(condition, message) {
  if (condition) {
    console.log(`[shell-test] ok: ${message}`);
    return;
  }

  failures.push(message);
  console.log(`[shell-test] FAIL: ${message}`);
}

async function waitFor(predicate, message, timeoutMs = STEP_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate())
      return true;
    await Scripting.sleep(100);
  }

  check(false, message);
  return false;
}

function extension() {
  return Main.extensionManager.lookup(UUID);
}

export async function run() {
  await waitFor(
    () => extension()?.state === ACTIVE,
    'extension reaches ACTIVE state',
    WAIT_TIMEOUT_MS,
  );

  const ext = extension();
  const error = ext?.error ? `: ${ext.error}` : '';
  check(ext?.state === ACTIVE, 'extension is active');
  check(!ext?.error, `extension has no errors${error}`);

  const button = Main.panel.statusArea[UUID];
  check(Boolean(button), 'panel button exists');

  if (!button)
    return;

  button.menu.open();
  await Scripting.sleep(250);
  check(button.menu.isOpen, 'menu opens');

  button.menu.close();
  await Scripting.sleep(250);
  check(!button.menu.isOpen, 'menu closes');

  Main.extensionManager.disableExtension(UUID);
  await waitFor(
    () => !Main.panel.statusArea[UUID],
    'disabling removes the panel button',
  );

  Main.extensionManager.enableExtension(UUID);
  await waitFor(
    () => extension()?.state === ACTIVE && Boolean(Main.panel.statusArea[UUID]),
    're-enabling restores the panel button',
  );
}

export function finish() {
  if (failures.length > 0)
    throw new Error(`shell smoke test failed: ${failures.join('; ')}`);

  console.log('[shell-test] all checks passed');
}
