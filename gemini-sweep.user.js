// ==UserScript==
// @name         Gemini Sweep - Purge Unpinned Chats
// @namespace    https://github.com/hv33y
// @version      2.5.1
// @description  Automated bulk deletion of unpinned Google Gemini conversations with infinite scroll support.
// @author       hv33y (https://github.com/hv33y)
// @homepageURL  https://github.com/hv33y/gemini-sweep
// @supportURL   https://github.com/hv33y/gemini-sweep/issues
// @updateURL    https://raw.githubusercontent.com/hv33y/gemini-sweep/master/gemini-sweep.user.js
// @downloadURL  https://raw.githubusercontent.com/hv33y/gemini-sweep/master/gemini-sweep.user.js
// @match        *://gemini.google.com/*
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    console.log('[Gemini Sweep] Initializing v2.5.1...');

    let isRunning = false;
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const getAuthorTag = () => {
        try {
            return atob(atob('UUdoMk16TjU='));
        } catch {
            return '@hv33y';
        }
    };

    function applyInlineStyles(element, styles) {
        for (const [property, value] of Object.entries(styles)) {
            element.style.setProperty(property, value, 'important');
        }
    }

    function createActionButton() {
        if (document.getElementById('gemini-sweep-btn')) return;

        const targetRoot = document.documentElement || document.body;
        if (!targetRoot) return;

        const container = document.createElement('div');
        container.id = 'gemini-sweep-container';
        applyInlineStyles(container, {
            'position': 'fixed',
            'bottom': '24px',
            'right': '24px',
            'z-index': '2147483647',
            'display': 'flex',
            'align-items': 'center',
            'pointer-events': 'auto'
        });

        const btn = document.createElement('button');
        btn.id = 'gemini-sweep-btn';

        const labelSpan = document.createElement('span');
        labelSpan.id = 'gemini-sweep-label';
        labelSpan.textContent = 'Purge Unpinned';

        const creditSpan = document.createElement('span');
        creditSpan.id = 'gemini-sweep-credit';
        creditSpan.textContent = getAuthorTag();
        applyInlineStyles(creditSpan, {
            'opacity': '0.75',
            'font-size': '11px',
            'font-weight': '400'
        });

        btn.appendChild(labelSpan);
        btn.appendChild(creditSpan);

        applyInlineStyles(btn, {
            'background-color': '#d93025',
            'color': '#ffffff',
            'border': '1px solid rgba(255, 255, 255, 0.2)',
            'border-radius': '8px',
            'padding': '10px 18px',
            'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            'font-size': '13px',
            'font-weight': '600',
            'letter-spacing': '0.2px',
            'cursor': 'pointer',
            'outline': 'none',
            'box-shadow': '0 4px 16px rgba(0, 0, 0, 0.35)',
            'display': 'inline-flex',
            'align-items': 'center',
            'gap': '8px',
            'user-select': 'none',
            'transition': 'transform 0.15s ease, background-color 0.2s ease'
        });

        btn.onmouseover = () => {
            if (!isRunning) btn.style.setProperty('background-color', '#b3261e', 'important');
            btn.style.setProperty('transform', 'translateY(-2px)', 'important');
        };
        btn.onmouseout = () => {
            if (!isRunning) btn.style.setProperty('background-color', '#d93025', 'important');
            btn.style.setProperty('transform', 'translateY(0)', 'important');
        };
        btn.onclick = toggleSweepProcess;

        container.appendChild(btn);
        targetRoot.appendChild(container);
    }

    function updateButtonUI(labelText, creditText, bgColor, borderColor) {
        const btn = document.getElementById('gemini-sweep-btn');
        const labelSpan = document.getElementById('gemini-sweep-label');
        const creditSpan = document.getElementById('gemini-sweep-credit');

        if (labelSpan) labelSpan.textContent = labelText;
        if (creditSpan) creditSpan.textContent = creditText;
        if (btn && bgColor) btn.style.setProperty('background-color', bgColor, 'important');
        if (btn && borderColor) btn.style.setProperty('border-color', borderColor, 'important');
    }

    function getChatScrollContainer() {
        return (
            document.querySelector('#sidenav-section-content-chats') ||
            document.querySelector('.chat-history') ||
            document.querySelector('conversations-list') ||
            document.querySelector('side-navigation-v2') ||
            document.querySelector('nav')
        );
    }

    async function tryLoadOlderChats() {
        const container = getChatScrollContainer();
        if (!container) return false;

        const previousHeight = container.scrollHeight;
        container.scrollTop = container.scrollHeight;

        // Give the network 1.2s to pull the next cursor chunk
        await sleep(1200);

        return container.scrollHeight > previousHeight || Boolean(getNextUnpinnedChatRow());
    }

    async function toggleSweepProcess() {
        const author = getAuthorTag();

        if (isRunning) {
            isRunning = false;
            updateButtonUI('Halting...', '', '#5f6368', 'transparent');
            return;
        }

        const confirmed = window.confirm(
            'Purge all unpinned chats? Pinned conversations will remain untouched.'
        );
        if (!confirmed) return;

        isRunning = true;
        updateButtonUI('Stop (0)', `by ${author}`, '#202124', '#d93025');

        let deletedCount = 0;
        let scrollAttempts = 0;

        try {
            while (isRunning) {
                await closeAnyLingeringDialogs();

                let targetRow = getNextUnpinnedChatRow();

                // If no items visible, scroll down to load older chats
                if (!targetRow) {
                    updateButtonUI(`Loading older... (${deletedCount})`, `by ${author}`, '#202124', '#d93025');
                    const loadedMore = await tryLoadOlderChats();

                    targetRow = getNextUnpinnedChatRow();
                    if (!targetRow) {
                        scrollAttempts++;
                        if (scrollAttempts >= 3) {
                            console.log('[Gemini Sweep] All chat history purged.');
                            break;
                        }
                        await sleep(800);
                        continue;
                    } else {
                        scrollAttempts = 0;
                    }
                } else {
                    scrollAttempts = 0;
                }

                targetRow.scrollIntoView({ block: 'center', behavior: 'instant' });
                targetRow.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                await sleep(150);

                const menuBtn = getRowMenuButton(targetRow);
                if (!menuBtn) {
                    console.warn('[Gemini Sweep] Could not find 3-dot button in row.');
                    break;
                }

                menuBtn.click();

                const deleteOption = await waitForDeleteMenuItem();
                if (!deleteOption) {
                    console.warn('[Gemini Sweep] Delete option missing in dropdown menu.');
                    document.body.click();
                    await sleep(300);
                    break;
                }

                deleteOption.click();

                const confirmBtn = await waitForActiveConfirmDeleteButton();
                if (!confirmBtn) {
                    console.warn('[Gemini Sweep] Delete confirm button not found in dialog.');
                    document.body.click();
                    await sleep(300);
                    break;
                }

                const targetDialogContainer = confirmBtn.closest('mat-dialog-container') || confirmBtn.closest('.cdk-overlay-pane');

                confirmBtn.click();
                deletedCount++;
                updateButtonUI(`Stop (${deletedCount})`, `by ${author}`, '#202124', '#d93025');

                await waitForElementRemoval(targetDialogContainer);
                await sleep(250);
            }

            alert(`Sweep completed. Removed ${deletedCount} unpinned conversation(s).`);
        } catch (err) {
            console.error('[Gemini Sweep] Execution error details:', err);
            alert(`Execution stopped: ${err.message || 'Check console output'}`);
        } finally {
            isRunning = false;
            updateButtonUI('Purge Unpinned', author, '#d93025', 'rgba(255, 255, 255, 0.2)');
        }
    }

    function getNextUnpinnedChatRow() {
        const rows = Array.from(document.querySelectorAll('gem-nav-list-item[data-test-id="conversation"]'));

        for (const row of rows) {
            if (!row.isConnected) continue;

            const isPinned = row.querySelector(
                'gem-icon[fonticonname="push_pin"], mat-icon[data-mat-icon-name="push_pin"], mat-icon[fonticon="push_pin"], .conversation-pin-icon'
            );
            if (isPinned) continue;

            const link = row.querySelector('a[href*="/app/"]');
            if (!link) continue;

            return row;
        }

        return null;
    }

    function getRowMenuButton(row) {
        return (
            row.querySelector('gem-icon-button[data-test-id="actions-menu-button"] button') ||
            row.querySelector('[data-test-id="actions-menu-button"] button') ||
            row.querySelector('button[aria-label*="More options" i]') ||
            row.querySelector('gem-icon-button[data-test-id="actions-menu-button"]')
        );
    }

    async function waitForDeleteMenuItem(retries = 20) {
        for (let i = 0; i < retries; i++) {
            const menuPanes = Array.from(document.querySelectorAll('.cdk-overlay-pane [role="menuitem"], .cdk-overlay-pane button'));
            const deleteItem = menuPanes.find((el) => {
                const text = (el.textContent || '').trim().toLowerCase();
                const aria = (el.getAttribute('aria-label') || '').trim().toLowerCase();
                const icon = el.querySelector('[data-mat-icon-name*="delete"], [fonticon*="delete"]');
                return text.includes('delete') || aria.includes('delete') || Boolean(icon);
            });

            if (deleteItem) return deleteItem;
            await sleep(50);
        }
        return null;
    }

    async function waitForActiveConfirmDeleteButton(retries = 25) {
        for (let i = 0; i < retries; i++) {
            const openDialogs = Array.from(
                document.querySelectorAll('mat-dialog-container.mdc-dialog--open, .mat-mdc-dialog-container.mdc-dialog--open')
            );

            const activeDialog = openDialogs.at(-1);
            if (activeDialog) {
                const buttons = Array.from(activeDialog.querySelectorAll('mat-dialog-actions button, button'));
                const deleteBtn = buttons.find((b) => {
                    const text = (b.textContent || '').trim().toLowerCase();
                    const aria = (b.getAttribute('aria-label') || '').trim().toLowerCase();
                    return (text.includes('delete') || aria.includes('delete')) && !text.includes('cancel');
                });

                if (deleteBtn) return deleteBtn;
            }
            await sleep(50);
        }
        return null;
    }

    async function waitForElementRemoval(element, maxAttempts = 30) {
        let attempts = 0;
        while (attempts < maxAttempts) {
            if (!element || !element.isConnected) break;
            const isHidden = window.getComputedStyle(element).display === 'none' || !element.classList.contains('mdc-dialog--open');
            if (isHidden) break;
            await sleep(100);
            attempts++;
        }
    }

    async function closeAnyLingeringDialogs() {
        const dialogs = Array.from(
            document.querySelectorAll('mat-dialog-container.mdc-dialog--open, .mat-mdc-dialog-container.mdc-dialog--open')
        );

        if (dialogs.length > 0) {
            for (const dialog of dialogs) {
                const cancelBtn = Array.from(dialog.querySelectorAll('button')).find((b) =>
                    (b.textContent || '').trim().toLowerCase().includes('cancel')
                );
                if (cancelBtn) cancelBtn.click();
            }
            await sleep(200);
        }
    }

    window.addEventListener('keydown', (e) => {
        if (e.altKey && (e.key === 'd' || e.key === 'D')) {
            e.preventDefault();
            toggleSweepProcess();
        }
    });

    if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand('Purge Unpinned Chats (' + getAuthorTag() + ')', toggleSweepProcess);
    }

    createActionButton();

    const observer = new MutationObserver(() => {
        if (!document.getElementById('gemini-sweep-btn')) {
            createActionButton();
        }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    setInterval(createActionButton, 1500);
})();
