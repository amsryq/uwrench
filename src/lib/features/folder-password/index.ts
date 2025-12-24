import type { FeatureDef } from '../../runtime/types';
import { waitForElement } from '../../utils/wait-for-element';
import {
  getFolderPassword,
  getFolderPasswords,
  removeFolderPassword,
  setFolderPassword,
} from './storage';

const REMEMBER_ID = 'uw-remember-folder-password';
const WRAPPER_ID = 'uw-remember-folder-password-wrapper';

export const folderPasswordFeature: FeatureDef = {
  id: 'folderPasswords',
  title: 'Folder Passwords',
  description: 'Optionally remember course content folder passwords.',
  defaults: { enabled: true, options: {} },
  setup: () => {
    let form: HTMLFormElement | null = null;
    let passwordInput: HTMLInputElement | null = null;
    let remember: HTMLInputElement | null = null;
    let saved: string | null = null;
    let didAutofill = false;
    let originalValue = '';
    let handleSubmit: (() => void) | null = null;
    let mounted = true;

    void (async () => {
      if (!mounted) return;
      if (!window.location.pathname.includes('/contents/index/')) return;

      form = await waitForElement('#MediaDirectoryIndexForm') as HTMLFormElement | null;
      if (!form || !mounted) return;

      passwordInput = form.querySelector('#pswrdInput') as HTMLInputElement | null;
      if (!passwordInput || !mounted) return;

      const folderKey = getFolderKey();
      if (!folderKey) return;

      remember = ensureRememberCheckbox(passwordInput);

      saved = await getFolderPassword(folderKey);

      originalValue = passwordInput.value;

      if (saved && !passwordInput.value) {
        didAutofill = true;
        passwordInput.value = saved;
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      handleSubmit = () => {
        const shouldRemember = remember?.checked ?? false;
        const value = passwordInput?.value ?? '';

        // If unchecked, treat this as "don't store" (and also forget any existing).
        if (!shouldRemember) {
          void removeFolderPassword(folderKey);
          return;
        }

        if (!value) return;
        void setFolderPassword(folderKey, value);
      };

      if (handleSubmit) form.addEventListener('submit', handleSubmit, true);
    })();

    return {
      cleanup: () => {
        mounted = false;
        if (handleSubmit && form) form.removeEventListener('submit', handleSubmit, true);

        // Remove injected UI.
        document.getElementById(WRAPPER_ID)?.remove();
        document.getElementById(REMEMBER_ID)?.remove();

        // Revert autofill if user hasn't changed it.
        if (didAutofill && saved && originalValue === '' && passwordInput?.value === saved) {
          if (passwordInput) {
            passwordInput.value = '';
            passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
            passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      },
    };
  },
  clearData: async () => {
    const all = await getFolderPasswords();
    for (const key of Object.keys(all)) {
      await removeFolderPassword(key);
    }
  },
};

function getFolderKey(): string | null {
  try {
    const url = new URL(window.location.href);
    // Key by pathname so it matches regardless of query/hash.
    return url.pathname;
  } catch {
    return null;
  }
}

function ensureRememberCheckbox(passwordInput: HTMLInputElement): HTMLInputElement {
  const existing = document.getElementById(REMEMBER_ID) as HTMLInputElement | null;
  if (existing) return existing;

  // Prefer inserting next to the password field.
  const passContainer = passwordInput.closest('#pass') as HTMLElement | null;
  const formGroup = passwordInput.closest('.form-group') as HTMLElement | null;

  const wrapper = document.createElement('div');
  wrapper.id = WRAPPER_ID;
  wrapper.className = 'form-group m-b-10 row';

  const labelCol = document.createElement('label');
  labelCol.className = 'col-4 col-form-label';
  labelCol.style.paddingLeft = '20px';
  labelCol.textContent = '';

  const controlCol = document.createElement('div');
  controlCol.className = 'col-8';

  const checkWrap = document.createElement('div');
  checkWrap.className = 'form-check';

  const input = document.createElement('input');
  input.id = REMEMBER_ID;
  input.type = 'checkbox';
  input.className = 'form-check-input';
  input.checked = true;

  const checkLabel = document.createElement('label');
  checkLabel.className = 'form-check-label';
  checkLabel.htmlFor = REMEMBER_ID;
  checkLabel.textContent = 'Remember password';

  checkWrap.appendChild(input);
  checkWrap.appendChild(checkLabel);
  controlCol.appendChild(checkWrap);

  wrapper.appendChild(labelCol);
  wrapper.appendChild(controlCol);

  // Insert right after the password row if possible.
  if (formGroup?.parentElement) {
    formGroup.parentElement.insertBefore(wrapper, formGroup.nextSibling);
  } else if (passContainer?.parentElement) {
    passContainer.parentElement.appendChild(wrapper);
  } else {
    // Fallback: append to the form.
    passwordInput.form?.appendChild(wrapper);
  }

  return input;
}
