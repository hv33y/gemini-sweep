// ==UserScript==
// @name         Gemini Sweep - Purge Unpinned Chats
// @namespace    https://github.com/hv33y
// @version      2.5.0
// @description  Automated bulk deletion of unpinned Google Gemini conversations.
// @author       hv33y (https://github.com/hv33y)
// @homepageURL  https://github.com/hv33y/gemini-sweep
// @supportURL   https://github.com/hv33y/gemini-sweep/issues
// @updateURL    https://raw.githubusercontent.com/hv33y/gemini-sweep/main/gemini-sweep.user.js
// @downloadURL  https://raw.githubusercontent.com/hv33y/gemini-sweep/main/gemini-sweep.user.js
// @match        *://gemini.google.com/*
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    console.log('[Gemini Sweep] Initializing...');

    let isRunning = false;
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Double Base64 decoded author credit: "@hv33y"
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
        console.log('[Gemini Sweep] Button injected successfully.');
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

        try {
            while (isRunning) {
                updateButtonUI(`Stop (${deletedCount})`, `by ${author}`, '#202124', '#d93025');

                let targetRow = getNextUnpinnedChatRow();

                if (!targetRow) {
                    await sleep(1000);
                    targetRow = getNextUnpinnedChatRow();
                    if (!targetRow) break;
                }

                targetRow.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                targetRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                await sleep(350);

                const menuBtn = findRowMenuButton(targetRow);
                if (!menuBtn) {
                    console.warn('[Gemini Sweep] Options menu button not found.');
                    break;
                }

                menuBtn.click();
                await sleep(450);

                const deleteOption = getActiveMenuDeleteOption();
                if (!deleteOption) {
                    console.warn('[Gemini Sweep] Delete option missing in active menu.');
                    document.body.click();
                    await sleep(350);
                    break;
                }

                deleteOption.click();
                await sleep(500);

                const confirmBtn = getDialogConfirmButton();
                if (confirmBtn) {
                    confirmBtn.click();
                    deletedCount++;
                    updateButtonUI(`Stop (${deletedCount})`, `by ${author}`, '#202124', '#d93025');

                    await waitForDialogToClose();
                    await sleep(750);
                } else {
                    console.warn('[Gemini Sweep] Confirmation dialog button not found.');
                    document.body.click();
                    await sleep(400);
                    break;
                }
            }

            alert(`Sweep completed. Removed ${deletedCount} unpinned conversation(s).`);
        } catch (err) {
            console.error('[Gemini Sweep] Execution error:', err);
            alert('Execution halted due to an unexpected error. Check console output.');
        } finally {
            isRunning = false;
            updateButtonUI('Purge Unpinned', author, '#d93025', 'rgba(255, 255, 255, 0.2)');
        }
    }

    function getNextUnpinnedChatRow() {
        const sideNav = document.querySelector('nav, side-navigation-v2, .side-nav-container') || document.body;

        const allTextElements = Array.from(sideNav.querySelectorAll('*'));
        const recentHeader = allTextElements.find((el) => {
            return el.children.length === 0 && el.textContent.trim().toLowerCase() === 'recent';
        });

        const conversationRows = Array.from(
            sideNav.querySelectorAll('a[href^="/app/"], [data-test-id*="conversation"]')
        );

        for (const item of conversationRows) {
            const row = item.closest('[role="listitem"], [data-test-id*="conversation"]') || item;

            if (recentHeader) {
                const position = recentHeader.compareDocumentPosition(row);
                if (!(position & Node.DOCUMENT_POSITION_FOLLOWING)) {
                    continue;
                }
            }

            const hasPin = row.querySelector(
                '[data-mat-icon-name="keep"], [data-mat-icon-name="push_pin"], mat-icon[aria-label*="pin" i]'
            );
            const ariaLabel = (row.getAttribute('aria-label') || '').toLowerCase();
            if (hasPin || ariaLabel.includes('pinned')) {
                continue;
            }

            return row;
        }

        return null;
    }

    function findRowMenuButton(row) {
        return (
            row.querySelector('button[aria-label*="options" i]') ||
            row.querySelector('button[aria-label*="more" i]') ||
            row.querySelector('button[aria-haspopup="menu"]') ||
            row.querySelector('button mat-icon[data-mat-icon-name="more_vert"]')?.closest('button') ||
            row.querySelector('button')
        );
    }

    function getActiveMenuDeleteOption() {
        const panels = Array.from(
            document.querySelectorAll(
                '.cdk-overlay-pane [role="menu"], [role="menu"], mat-menu-panel, .mat-mdc-menu-panel'
            )
        );

        const openMenu = panels.reverse().find((m) => m.offsetHeight > 0 || m.offsetParent !== null);
        if (!openMenu) return null;

        const items = Array.from(
            openMenu.querySelectorAll('[role="menuitem"], button, mat-list-item, .mat-mdc-menu-item')
        );

        return items.find((el) => {
            const label = el.textContent.trim().toLowerCase();
            return label.includes('delete') || label.includes('remove');
        });
    }

    function getDialogConfirmButton() {
        const dialog = document.querySelector(
            '[role="dialog"], [role="alertdialog"], mat-dialog-container, .mat-mdc-dialog-container'
        );
        if (!dialog) return null;

        const buttons = Array.from(dialog.querySelectorAll('button'));
        return buttons.find((btn) => {
            const label = (btn.textContent || btn.getAttribute('aria-label') || '').trim().toLowerCase();
            return label.includes('delete') || label.includes('confirm');
        });
    }

    async function waitForDialogToClose() {
        let attempts = 0;
        while (attempts < 25) {
            const dialog = document.querySelector(
                '[role="dialog"], [role="alertdialog"], mat-dialog-container, .mat-mdc-dialog-container'
            );
            if (!dialog) break;
            await sleep(100);
            attempts++;
        }
    }

    // Keyboard trigger: Alt + D
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
