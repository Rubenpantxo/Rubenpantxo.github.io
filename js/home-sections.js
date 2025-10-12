// Gestiona las secciones dinámicas de la página principal con datos de js/site-data.js
(() => {
    'use strict';

    const pageState = { activeAppId: null };

    document.addEventListener('DOMContentLoaded', () => {
        const navItems = document.querySelectorAll('.nav-item');
        const contentSections = document.querySelectorAll('.content-section');
        const contactToggle = document.getElementById('contact-toggle');
        const socialLinks = document.getElementById('social-links');
        const backArrow = document.getElementById('back-arrow');
        const body = document.body;

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                if (body.classList.contains('section-open')) return;
                const sectionId = item.dataset.section;
                const targetSection = document.getElementById(sectionId + '-content');
                body.classList.add('section-open');
                navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                contactToggle.classList.add('icon-hidden');
                backArrow.classList.remove('icon-hidden');
                contentSections.forEach(section => section.classList.add('content-hidden'));
                if (targetSection) {
                    targetSection.classList.remove('content-hidden');
                    targetSection.style.display = 'block';
                }
            });
        });

        backArrow.addEventListener('click', () => {
            body.classList.remove('section-open');
            navItems.forEach(item => item.classList.remove('active'));
            backArrow.classList.add('icon-hidden');
            contactToggle.classList.remove('icon-hidden');
            contentSections.forEach(section => {
                section.classList.add('content-hidden');
                setTimeout(() => {
                    if (!body.classList.contains('section-open')) {
                        section.style.display = 'none';
                    }
                }, 500);
            });
            socialLinks.classList.add('social-hidden');
        });

        contactToggle.addEventListener('click', () => {
            if (!body.classList.contains('section-open')) {
                socialLinks.classList.toggle('social-hidden');
            }
        });

        setupNews(getDataArray('news'));
        setupApps(getDataArray('apps'));
        setupLinks(getDataArray('linkGroups'));
    });

    function getDataArray(key) {
        if (window.siteData && Array.isArray(window.siteData[key])) {
            return window.siteData[key];
        }
        return [];
    }

    function setupNews(newsItems) {
        const newsList = document.getElementById('news-list');
        const filterSelect = document.getElementById('news-filter');
        const lastUpdateLabel = document.getElementById('news-last-update');
        if (!newsList || !filterSelect) return;

        const items = Array.isArray(newsItems) ? newsItems.slice() : [];
        items.sort((a, b) => {
            const dateA = new Date(a && a.publishedAt ? a.publishedAt : 0);
            const dateB = new Date(b && b.publishedAt ? b.publishedAt : 0);
            return dateB - dateA;
        });

        const tags = [];
        items.forEach(item => {
            if (item && Array.isArray(item.tags)) {
                item.tags.forEach(tag => {
                    if (tag && !tags.includes(tag)) {
                        tags.push(tag);
                    }
                });
            }
        });
        tags.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
        filterSelect.innerHTML = '<option value="all">Todas</option>' + tags.map(tag => '<option value="' + tag + '">' + tag + '</option>').join('');

        if (lastUpdateLabel) {
            if (items.length > 0) {
                lastUpdateLabel.textContent = 'Actualizado el ' + formatDateToSpanish(items[0].publishedAt);
            } else {
                lastUpdateLabel.textContent = 'Añade noticias en js/site-data.js para mostrarlas aquí.';
            }
        }

        function render(selectedTag) {
            const filtered = selectedTag && selectedTag !== 'all'
                ? items.filter(item => Array.isArray(item.tags) && item.tags.includes(selectedTag))
                : items;
            newsList.innerHTML = '';
            if (!filtered.length) {
                const empty = document.createElement('p');
                empty.className = 'rounded-lg border border-dashed border-blue-300 bg-white/80 p-4 text-sm text-gray-600';
                empty.textContent = 'No hay noticias en esta categoría por ahora.';
                newsList.appendChild(empty);
                return;
            }
            filtered.forEach(item => {
                newsList.appendChild(createNewsCard(item));
            });
        }

        filterSelect.addEventListener('change', event => {
            render(event.target.value);
        });

        render(filterSelect.value || 'all');
    }

    function createNewsCard(item) {
        const article = document.createElement('article');
        article.className = 'news-card flex gap-4 rounded-xl bg-white/90 p-4 shadow-md';

        const mediaWrapper = document.createElement('div');
        mediaWrapper.className = 'flex-shrink-0';
        if (item && item.image) {
            const img = document.createElement('img');
            img.src = item.image;
            img.alt = item.title ? 'Imagen de ' + item.title : 'Imagen de la noticia';
            img.className = 'h-24 w-24 rounded-lg object-cover shadow';
            mediaWrapper.appendChild(img);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'flex h-24 w-24 items-center justify-center rounded-lg bg-blue-100 text-blue-600 shadow';
            placeholder.innerHTML = '<i class="fa-solid fa-newspaper text-2xl"></i>';
            mediaWrapper.appendChild(placeholder);
        }
        article.appendChild(mediaWrapper);

        const content = document.createElement('div');
        content.className = 'flex-1 space-y-2';

        const title = document.createElement('h4');
        title.className = 'text-lg font-bold text-blue-900';
        title.textContent = item && item.title ? item.title : 'Noticia sin título';
        content.appendChild(title);

        if (item && (item.summary || item.description)) {
            const summary = document.createElement('p');
            summary.className = 'text-sm text-gray-700';
            summary.textContent = item.summary || item.description;
            content.appendChild(summary);
        }

        if (item && Array.isArray(item.tags) && item.tags.length) {
            const tagsWrapper = document.createElement('div');
            tagsWrapper.className = 'flex flex-wrap gap-2';
            item.tags.forEach(tag => {
                if (!tag) return;
                const badge = document.createElement('span');
                badge.className = 'keyword-badge bg-blue-100/60 text-blue-700';
                badge.textContent = tag;
                tagsWrapper.appendChild(badge);
            });
            content.appendChild(tagsWrapper);
        }

        const meta = document.createElement('div');
        meta.className = 'flex flex-wrap items-center gap-4 text-xs text-gray-500';
        const dateText = formatDateToSpanish(item && item.publishedAt);
        if (dateText) {
            const dateSpan = document.createElement('span');
            dateSpan.innerHTML = '<i class="fa-regular fa-calendar"></i> ' + dateText;
            meta.appendChild(dateSpan);
        }
        if (item && item.source) {
            const sourceSpan = document.createElement('span');
            sourceSpan.innerHTML = '<i class="fa-solid fa-globe"></i> ' + item.source;
            meta.appendChild(sourceSpan);
        }
        if (meta.children.length) {
            content.appendChild(meta);
        }

        if (item && item.link) {
            const action = document.createElement('a');
            action.href = item.link;
            action.target = '_blank';
            action.rel = 'noopener noreferrer';
            action.className = 'inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-800';
            action.innerHTML = 'Leer más <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i>';
            content.appendChild(action);
        }

        article.appendChild(content);
        return article;
    }

    function formatDateToSpanish(dateString) {
        if (!dateString) return '';

        const date = parseDateWithoutUtcShift(dateString);
        if (!date) return '';

        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function parseDateWithoutUtcShift(value) {
        if (!value) return null;

        const raw = typeof value === 'string' ? value.trim() : value;
        if (!raw) return null;

        if (typeof raw === 'string') {
            const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (dateOnlyMatch) {
                const [, year, month, day] = dateOnlyMatch;
                const localDate = new Date(Number(year), Number(month) - 1, Number(day));
                if (!isNaN(localDate.getTime())) return localDate;
            }

            const localDateTimeMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
            if (localDateTimeMatch) {
                const [, year, month, day, hours, minutes, seconds = '0'] = localDateTimeMatch;
                const localDate = new Date(
                    Number(year),
                    Number(month) - 1,
                    Number(day),
                    Number(hours),
                    Number(minutes),
                    Number(seconds)
                );
                if (!isNaN(localDate.getTime())) return localDate;
            }
        }

        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    function setupApps(apps) {
        const grid = document.getElementById('apps-grid');
        const placeholder = document.getElementById('app-placeholder');
        const panelsContainer = document.getElementById('app-panels');
        const resetBtn = document.getElementById('apps-reset');
        if (!grid || !panelsContainer) return;

        const placeholderDefault = placeholder ? placeholder.innerHTML : '';
        grid.innerHTML = '';

        const panelElements = Array.from(panelsContainer.querySelectorAll('[data-app-panel]'));
        const panelMap = {};
        panelElements.forEach(panel => {
            panel.classList.add('hidden');
            panelMap[panel.dataset.appPanel] = panel;
        });

        function setActiveApp(appId) {
            pageState.activeAppId = appId || null;
            const activePanel = appId ? panelMap[appId] : null;
            panelElements.forEach(panel => {
                const isActive = panel.dataset.appPanel === appId;
                panel.classList.toggle('hidden', !isActive);
                panel.dispatchEvent(new Event(isActive ? 'app:activated' : 'app:deactivated'));
            });
            Array.from(grid.querySelectorAll('.app-card')).forEach(card => {
                card.classList.toggle('active', card.dataset.appId === appId);
            });
            if (placeholder) {
                if (activePanel) {
                    placeholder.classList.add('hidden');
                } else {
                    placeholder.classList.remove('hidden');
                    placeholder.innerHTML = placeholderDefault;
                    if (appId) {
                        placeholder.innerHTML = '<div><p class="text-lg font-semibold">Esta aplicación todavía no tiene contenido embebido.</p><p class="mt-2 text-sm text-slate-300">Añade un contenedor con <code>data-app-panel="' + appId + '"</code> para mostrarlo automáticamente.</p></div>';
                        const appData = Array.isArray(apps) ? apps.find(app => app && app.id === appId) : null;
                        if (appData && appData.description) {
                            placeholder.innerHTML += '<p class="mt-2 text-sm text-slate-200">' + appData.description + '</p>';
                        }
                    }
                }
            }
        }

        if (!apps || !apps.length) {
            const message = document.createElement('p');
            message.className = 'rounded-lg border border-dashed border-blue-300 bg-white/80 p-4 text-center text-sm text-gray-600';
            message.textContent = 'No hay aplicaciones configuradas todavía. Añádelas en js/site-data.js.';
            grid.appendChild(message);
            setActiveApp(null);
            if (resetBtn) resetBtn.classList.add('hidden');
            return;
        }

        apps.forEach(app => {
            if (!app || !app.id) return;
            const card = document.createElement('button');
            card.type = 'button';
            card.dataset.appId = app.id;
            card.className = 'app-card flex h-full flex-col gap-3 focus:outline-none focus:ring-4 focus:ring-blue-200';

            const heading = document.createElement('div');
            heading.className = 'flex items-center gap-3';
            const iconSpan = document.createElement('span');
            iconSpan.className = 'app-card__icon';
            iconSpan.innerHTML = '<i class="' + (app.icon || 'fa-solid fa-cube') + '"></i>';
            heading.appendChild(iconSpan);
            const titleWrapper = document.createElement('div');
            titleWrapper.innerHTML = '<h4 class="text-lg font-bold text-slate-900">' + (app.title || 'Aplicación sin título') + '</h4>' + (app.subtitle ? '<p class="text-xs uppercase tracking-wide text-slate-500">' + app.subtitle + '</p>' : '');
            heading.appendChild(titleWrapper);
            card.appendChild(heading);

            if (app.description) {
                const desc = document.createElement('p');
                desc.className = 'text-sm text-slate-600';
                desc.textContent = app.description;
                card.appendChild(desc);
            }

            if (Array.isArray(app.keywords) && app.keywords.length) {
                const keywords = document.createElement('div');
                keywords.className = 'flex flex-wrap gap-2';
                app.keywords.forEach(keyword => {
                    if (!keyword) return;
                    const badge = document.createElement('span');
                    badge.className = 'keyword-badge';
                    badge.textContent = keyword;
                    keywords.appendChild(badge);
                });
                card.appendChild(keywords);
            }

            card.addEventListener('click', () => {
                if (pageState.activeAppId === app.id) return;
                setActiveApp(app.id);
            });

            grid.appendChild(card);
        });

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                setActiveApp(null);
            });
        }

        setActiveApp(null);
    }

    function setupLinks(linkGroups) {
        const container = document.getElementById('link-groups');
        if (!container) return;
        container.innerHTML = '';

        if (!linkGroups || !linkGroups.length) {
            const message = document.createElement('p');
            message.className = 'rounded-lg border border-dashed border-emerald-200 bg-white/80 p-4 text-sm text-gray-600';
            message.textContent = 'Añade enlaces en js/site-data.js para mostrarlos agrupados aquí.';
            container.appendChild(message);
            return;
        }

        linkGroups.forEach(group => {
            if (!group) return;
            const section = document.createElement('section');
            section.className = 'link-group p-6 shadow-lg';

            const header = document.createElement('div');
            header.className = 'flex items-start gap-3';
            const iconSpan = document.createElement('span');
            iconSpan.className = 'text-2xl text-cyan-700';
            iconSpan.innerHTML = '<i class="' + (group.icon || 'fa-solid fa-link') + '"></i>';
            header.appendChild(iconSpan);
            const textWrapper = document.createElement('div');
            const title = document.createElement('h4');
            title.className = 'text-xl font-bold text-slate-800';
            title.textContent = group.title || 'Grupo sin título';
            textWrapper.appendChild(title);
            if (group.description) {
                const desc = document.createElement('p');
                desc.className = 'text-sm text-slate-600';
                desc.textContent = group.description;
                textWrapper.appendChild(desc);
            }
            header.appendChild(textWrapper);
            section.appendChild(header);

            const grid = document.createElement('div');
            grid.className = 'mt-4 grid gap-4 md:grid-cols-2';
            if (Array.isArray(group.links)) {
                group.links.forEach(link => {
                    grid.appendChild(createLinkCard(link));
                });
            }
            if (grid.children.length === 0) {
                const empty = document.createElement('p');
                empty.className = 'rounded-lg border border-dashed border-cyan-200 bg-white/70 p-4 text-sm text-gray-600';
                empty.textContent = 'No hay enlaces en este grupo todavía.';
                grid.appendChild(empty);
            }
            section.appendChild(grid);
            container.appendChild(section);
        });
    }

    function createLinkCard(link) {
        const anchor = document.createElement('a');
        if (link && link.url) {
            anchor.href = link.url;
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer';
        } else {
            anchor.href = '#';
            anchor.addEventListener('click', event => event.preventDefault());
        }
        anchor.className = 'link-card block rounded-xl border border-cyan-100/80 bg-white/90 p-4 shadow-sm focus:outline-none focus:ring-4 focus:ring-cyan-200';

        const header = document.createElement('div');
        header.className = 'flex items-center gap-3 text-cyan-700';
        const iconSpan = document.createElement('span');
        iconSpan.className = 'text-xl';
        iconSpan.innerHTML = '<i class="' + (link && link.icon ? link.icon : 'fa-solid fa-arrow-up-right-from-square') + '"></i>';
        header.appendChild(iconSpan);
        const title = document.createElement('h5');
        title.className = 'text-lg font-semibold text-slate-800';
        title.textContent = link && link.label ? link.label : 'Recurso sin nombre';
        header.appendChild(title);
        anchor.appendChild(header);

        if (link && link.description) {
            const desc = document.createElement('p');
            desc.className = 'mt-2 text-sm text-gray-700';
            desc.textContent = link.description;
            anchor.appendChild(desc);
        }

        const footer = document.createElement('span');
        footer.className = 'mt-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-600';
        footer.innerHTML = 'Visitar recurso <i class="fa-solid fa-arrow-up-right-from-square text-[0.65rem]"></i>';
        anchor.appendChild(footer);

        return anchor;
    }
})();
