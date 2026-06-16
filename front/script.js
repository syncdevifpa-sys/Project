

const sidebar = document.getElementById('sidebar')

const overlay = document.getElementById('overlay')

const openSidebar = document.getElementById('openSidebar')

const closeSidebar = document.getElementById('closeSidebar')

/* ABRIR */

function openMenu(){
    sidebar.classList.add('active')

    overlay.classList.add('active')

    document.body.style.overflow = 'hidden'
}

/* FECHAR */

function closeMenu(){
    sidebar.classList.remove('active')

    overlay.classList.remove('active')

    document.body.style.overflow = 'auto'
}

/* EVENTOS */

openSidebar.addEventListener('click', openMenu)

closeSidebar.addEventListener('click', closeMenu)

overlay.addEventListener('click', closeMenu)

