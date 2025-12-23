import { waitForElement } from '../../../lib/utils/wait-for-element';
import {
  getFolderPassword,
  removeFolderPassword,
  setFolderPassword,
} from '../../../lib/features/folder-password/storage';

const REMEMBER_ID = 'uw-remember-folder-password';

export async function setupCourseContentFolderPassword() {
  if (!window.location.pathname.includes('/contents/index/')) return;

  const form = (await waitForElement('#MediaDirectoryIndexForm')) as HTMLFormElement | null;
  if (!form) return;

  const passwordInput = form.querySelector('#pswrdInput') as HTMLInputElement | null;
  if (!passwordInput) return;

  const folderKey = getFolderKey();
  if (!folderKey) return;

  const remember = ensureRememberCheckbox(passwordInput);

  const saved = await getFolderPassword(folderKey);
  if (saved && !passwordInput.value) {
    passwordInput.value = saved;
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  form.addEventListener(
    'submit',
    () => {
      const shouldRemember = remember.checked;
      const value = passwordInput.value;

      // If unchecked, treat this as "don't store" (and also forget any existing).
      if (!shouldRemember) {
        void removeFolderPassword(folderKey);
        return;
      }

      if (!value) return;
      void setFolderPassword(folderKey, value);
    },
    true,
  );
}

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
