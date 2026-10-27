(function (A) {
    'use strict';
    let sequence = 0;
    A.confirmAction = function ({ title, message, items = [], confirmLabel = 'Excluir' }) {
        return new Promise((resolve) => {
            const previous = document.activeElement;
            const dialog = document.createElement('dialog');
            dialog.className = 'ar-confirm-dialog';
            dialog.setAttribute('role', 'alertdialog');
            const heading = document.createElement('h2');
            heading.id = 'arcadiaConfirmTitle' + ++sequence;
            heading.textContent = title;
            const description = document.createElement('p');
            description.id = 'arcadiaConfirmDescription' + sequence;
            description.textContent = message;
            dialog.setAttribute('aria-labelledby', heading.id);
            dialog.setAttribute('aria-describedby', description.id);
            dialog.append(heading, description);
            if (items.length) {
                const list = document.createElement('ul');
                list.className = 'ar-confirm-items';
                for (const text of items) {
                    const item = document.createElement('li');
                    item.textContent = text;
                    list.append(item);
                }
                dialog.append(list);
            }
            const actions = document.createElement('div');
            actions.className = 'ar-confirm-actions';
            const cancel = document.createElement('button');
            cancel.type = 'button';
            cancel.className = 'ar-btn ar-btn--secondary';
            cancel.textContent = 'Cancelar';
            const confirm = document.createElement('button');
            confirm.type = 'button';
            confirm.className = 'ar-btn ar-confirm-danger';
            confirm.textContent = confirmLabel;
            actions.append(cancel, confirm);
            dialog.append(actions);
            let settled = false;
            const finish = (value) => {
                if (settled) return;
                settled = true;
                dialog.close();
                dialog.remove();
                if (previous?.isConnected) previous.focus();
                resolve(value);
            };
            cancel.addEventListener('click', () => finish(false));
            confirm.addEventListener('click', () => finish(true));
            dialog.addEventListener('cancel', (event) => {
                event.preventDefault();
                finish(false);
            });
            dialog.addEventListener('close', () => finish(false));
            document.body.append(dialog);
            (window.Arcadia.dialogShell ? window.Arcadia.dialogShell.open(dialog) : dialog.showModal());
            cancel.focus({preventScroll:true});
        });
    };
})(window.Arcadia);
