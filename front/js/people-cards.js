(function (A) {
    'use strict';
    A.personCard = function (person, role) {
        const make = (tag, text) => {
            const node = document.createElement(tag);
            if (text) node.textContent = text;
            return node;
        };
        const card = make('article');
        card.className = 'ar-card ar-person-card';
        const rawName = person.nome_exibicao || person.nome_social || person.nome || 'Pessoa';
        const name = A.formatPersonName ? A.formatPersonName(rawName) : rawName;
        const avatar = make('div');
        avatar.className = 'ar-person-avatar';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((word) => word[0])
            .join('')
            .toUpperCase();
        if (
            typeof person.foto === 'string' &&
            /^data:image\/(png|jpeg|webp);base64,[a-z\d+/]+=*$/i.test(person.foto)
        ) {
            const initials = avatar.textContent;
            const image = make('img');
            image.src = person.foto;
            image.alt = '';
            image.addEventListener('error', () => {
                avatar.textContent = initials;
            });
            avatar.replaceChildren(image);
        }
        const title = make('h3', name);
        title.className = 'ar-card-title';
        const description = make('p', person.sobre || person.setor || '');
        description.className = 'ar-card-desc';
        const meta = make('p', role);
        meta.className = 'ar-card-meta';
        card.append(avatar, title, description, meta);
        if (person.nome_completo && person.nome_completo !== rawName) {
            const original = make(
                'small',
                A.formatPersonName?.(person.nome_completo) || person.nome_completo
            );
            original.className = 'ar-card-meta';
            title.after(original);
        }
        const contacts = make('div');
        contacts.className = 'ar-person-contacts';
        if (
            typeof person.contato_email === 'string' &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.contato_email)
        ) {
            const link = make('a', person.contato_email);
            link.className = 'ar-person-contact ar-person-contact--email';
            link.href = 'mailto:' + encodeURIComponent(person.contato_email);
            contacts.append(link);
        }
        if (person.contato_handle) {
            const handle = make('span', person.contato_handle);
            handle.className = 'ar-person-contact ar-person-contact--handle';
            contacts.append(handle);
        }
        if (
            typeof person.contato_telefone === 'string' &&
            /^\+?\d{7,15}$/.test(person.contato_telefone)
        ) {
            const link = make('a', person.contato_telefone);
            link.className = 'ar-person-contact ar-person-contact--phone';
            link.href = 'tel:' + person.contato_telefone;
            contacts.append(link);
        }
        if (!contacts.childNodes.length)
            contacts.append(make('span', 'Nenhum contato compartilhado.'));
        card.append(contacts);
        return card;
    };
})((window.Arcadia = window.Arcadia || {}));
