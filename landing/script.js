// URL de la API — cambiar a producción cuando se despliegue
const API_URL = 'https://api.landbrokers.cl';

// Escapa HTML antes de insertar contenido de la API en innerHTML
function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

// Formato moneda chilena: 12500000 → "$12.500.000"
function formatCLP(valor) {
    if (valor === null || valor === undefined) return '';
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(valor);
}

document.addEventListener("DOMContentLoaded", () => {

    // 1. Initialize Lenis for Smooth Scrolling
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        mouseMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
        infinite: false,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // 2. Hero GSAP Animations
    const tl = gsap.timeline();
    tl.to(".gsap-reveal", { y: 0, opacity: 1, duration: 1, ease: "power3.out", delay: 0.2 })
      .to(".gsap-reveal-delay", { y: 0, opacity: 1, duration: 1, ease: "power3.out" }, "-=0.6")
      .to(".gsap-reveal-delay-2", { y: 0, opacity: 1, duration: 1, ease: "power3.out" }, "-=0.6");

    // 3. Header scroll effect
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 50);
    });

    // 4. AOS
    AOS.init({ once: true, offset: 100, duration: 800, easing: 'ease-out-cubic' });

    // 5. Tilt Cards (sección propuesta de valor)
    VanillaTilt.init(document.querySelectorAll(".value-section .tilt-card"), {
        max: 5, speed: 400, glare: true, "max-glare": 0.1,
    });

    // 6. Cargar proyectos desde la API
    loadProyectos();

    // 7. Cargar remates desde la API
    loadRemates();
});

async function loadProyectos() {
    const container = document.getElementById('projects-list');
    try {
        const res = await fetch(`${API_URL}/api/proyectos`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const proyectos = await res.json();

        if (!proyectos.length) {
            container.innerHTML = '<p style="text-align:center; padding:60px 0; color:var(--color-text-muted);">No hay proyectos disponibles por el momento.</p>';
            return;
        }

        container.innerHTML = proyectos.map((p, i) => renderProyectoCard(p, i)).join('');

        // Poblar el select del formulario de contacto con los proyectos activos
        const select = document.getElementById('lead-proyecto');
        if (select) {
            proyectos.filter(p => p.estado === 'activo').forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.nombre;
                select.appendChild(opt);
            });
        }

        // Re-init tilt en las tarjetas recién insertadas
        VanillaTilt.init(document.querySelectorAll('#projects-list .tilt-card'), {
            max: 5, speed: 400, glare: true, "max-glare": 0.1,
        });

        // Re-init AOS para los nuevos elementos
        AOS.refresh();

    } catch (err) {
        console.error('Error cargando proyectos:', err);
        container.innerHTML = '<p style="text-align:center; padding:60px 0; color:var(--color-text-muted);">No se pudieron cargar los proyectos. <a href="https://wa.me/56982470858" target="_blank">Contáctenos por WhatsApp</a>.</p>';
    }
}

async function loadRemates() {
    const section = document.getElementById('remates');
    const container = document.getElementById('remates-list');
    try {
        const res = await fetch(`${API_URL}/api/remates`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const remates = await res.json();

        if (!remates.length) return; // sección permanece oculta

        container.innerHTML = remates.map((r, i) => renderRemateCard(r, i)).join('');
        section.style.display = '';

        VanillaTilt.init(document.querySelectorAll('#remates-list .tilt-card'), {
            max: 5, speed: 400, glare: true, "max-glare": 0.1,
        });
        AOS.refresh();

    } catch (err) {
        console.error('Error cargando remates:', err);
        // Sin remates disponibles: la sección permanece oculta, sin mostrar error al usuario
    }
}

function formatFechaRemate(fechaISO) {
    if (!fechaISO) return '';
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const d = new Date(fechaISO);
    return `${d.getUTCDate()} de ${meses[d.getUTCMonth()]}, ${d.getUTCFullYear()}`;
}

function formatCLP(valor) {
    if (valor === null || valor === undefined) return '';
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(valor);
}

const REMATE_ESTADO_LABELS = {
    programado: { texto: 'Programado', color: '#3498db' },
    en_curso: { texto: 'En Curso', color: '#e67e22' },
    adjudicado: { texto: 'Adjudicado', color: '#27ae60' },
    suspendido: { texto: 'Suspendido', color: '#7f8c8d' },
};

function renderRemateCard(r, index) {
    const delay = (index + 1) * 100;
    const estadoInfo = REMATE_ESTADO_LABELS[r.remate_estado] || REMATE_ESTADO_LABELS.programado;

    const imagenHTML = r.imagen_portada
        ? `<div style="height:220px; border-radius:4px 4px 0 0; overflow:hidden; margin:-50px -50px 30px -50px;">
               <img src="${r.imagen_portada}" alt="${r.nombre}" style="width:100%; height:100%; object-fit:cover; display:block;">
           </div>`
        : '';

    return `
        <div class="project-showcase tilt-card" data-aos="fade-up" data-aos-delay="${delay}"
            style="background:var(--color-white); border-radius:4px; box-shadow:0 15px 40px rgba(0,0,0,0.04); padding:50px; margin-bottom:40px; text-align:center;">
            ${imagenHTML}
            <span style="display:inline-block; margin-bottom:12px; padding:4px 12px; border-radius:2px; font-size:0.8rem; font-weight:600; text-transform:uppercase; background:${estadoInfo.color}; color:#fff;">${estadoInfo.texto}</span>
            <h3 style="font-size:1.5rem; margin-bottom:10px;">${r.nombre}</h3>
            <h5 class="accent-gold" style="margin-bottom:20px; font-weight:500;">${r.ubicacion || ''}</h5>
            <div style="display:flex; justify-content:center; gap:40px; flex-wrap:wrap; margin-bottom:10px;">
                <div>
                    <div style="font-size:0.8rem; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">Fecha del remate</div>
                    <div style="font-size:1.1rem; font-weight:600;">${formatFechaRemate(r.remate_fecha)}</div>
                </div>
                <div>
                    <div style="font-size:0.8rem; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">Precio mínimo</div>
                    <div style="font-size:1.1rem; font-weight:600;">${formatCLP(r.remate_precio_minimo)}</div>
                </div>
            </div>
        </div>
    `;
}

// Formulario de contacto → /api/leads
document.getElementById('lead-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const msg = document.getElementById('lead-msg');
    btn.disabled = true;
    btn.innerHTML = 'Enviando... <i class="fa-solid fa-spinner fa-spin" style="margin-left:8px;"></i>';
    msg.style.display = 'none';

    try {
        const res = await fetch(`${API_URL}/api/leads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: document.getElementById('lead-nombre').value.trim(),
                email: document.getElementById('lead-email').value.trim(),
                telefono: document.getElementById('lead-telefono').value.trim() || null,
                mensaje: document.getElementById('lead-mensaje').value.trim() || null,
                proyecto_id: document.getElementById('lead-proyecto').value || null,
                website: document.getElementById('lead-website').value, // honeypot
            })
        });
        if (!res.ok) throw new Error();
        msg.style.cssText = 'display:block; color:#155724; background:#d4edda; padding:12px; border-radius:4px;';
        msg.textContent = '¡Mensaje enviado! Nos contactaremos a la brevedad.';
        e.target.reset();
    } catch {
        msg.style.cssText = 'display:block; color:#721c24; background:#f8d7da; padding:12px; border-radius:4px;';
        msg.innerHTML = 'Error al enviar. Contáctenos por <a href="https://wa.me/56982470858" target="_blank">WhatsApp</a>.';
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Enviar Consulta <i class="fa-solid fa-paper-plane" style="margin-left:8px;"></i>';
    }
});

function renderProyectoCard(p, index) {
    const delay = (index + 1) * 100;
    const estadoBadge = p.estado !== 'activo' ? `<span style="display:inline-block; margin-bottom:12px; padding:4px 12px; border-radius:2px; font-size:0.8rem; font-weight:600; text-transform:uppercase; background:${p.estado === 'vendido' ? '#c0392b' : '#f39c12'}; color:#fff;">${p.estado === 'vendido' ? 'Vendido' : 'Próximamente'}</span>` : '';

    // Fila de datos comerciales: solo se muestran los campos que Joan haya cargado
    const datos = [];
    if (p.precio_desde) datos.push({ label: 'Desde', valor: formatCLP(p.precio_desde) });
    if (p.superficie) datos.push({ label: 'Superficie', valor: esc(p.superficie) });
    if (p.lotes_disponibles !== null && p.lotes_disponibles !== undefined) {
        datos.push({ label: 'Lotes disponibles', valor: p.lotes_totales ? `${p.lotes_disponibles} de ${p.lotes_totales}` : `${p.lotes_disponibles}` });
    }
    const datosHTML = datos.length ? `
        <div style="display:flex; justify-content:center; gap:40px; flex-wrap:wrap; margin-bottom:30px;">
            ${datos.map(d => `
                <div>
                    <div style="font-size:0.8rem; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">${d.label}</div>
                    <div style="font-size:1.15rem; font-weight:600; color:var(--color-primary);">${d.valor}</div>
                </div>
            `).join('')}
        </div>
    ` : '';

    const enlaceBtn = p.url_externa
        ? `<a href="${esc(p.url_externa)}" target="_blank" rel="noopener" class="btn btn-outline" style="color:var(--color-primary); border-color:var(--color-primary);">VER PROYECTO <i class="fa-solid fa-arrow-right" style="margin-left:8px; font-size:1rem;"></i></a>`
        : '';

    const consultarBtn = p.estado === 'activo'
        ? `<a href="#contacto" class="btn btn-primary" onclick="preseleccionarProyecto('${p.id}')">CONSULTAR <i class="fa-solid fa-envelope" style="margin-left:8px; font-size:1rem;"></i></a>`
        : '';

    const botonesHTML = (enlaceBtn || consultarBtn) ? `
        <div style="display:flex; justify-content:center; gap:14px; flex-wrap:wrap; margin-bottom:40px;">
            ${consultarBtn}
            ${enlaceBtn}
        </div>
    ` : '';

    const featuresHTML = (p.features || []).map(f => `
        <div style="background:var(--color-light); padding:25px; border-radius:4px; height:100%;">
            <h4 style="font-size:1.1rem; margin-bottom:12px; color:var(--color-primary); font-family:var(--font-heading);">
                ${esc(f.titulo)}
            </h4>
            <p style="font-size:0.9rem; color:var(--color-text-muted); margin:0; line-height:1.6;">${esc(f.descripcion)}</p>
        </div>
    `).join('');

    const featuresSection = featuresHTML ? `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:20px; border-top:1px solid rgba(0,0,0,0.05); padding-top:40px; text-align:left;">
            ${featuresHTML}
        </div>
    ` : '';

    return `
        <div class="project-showcase tilt-card" data-aos="fade-up" data-aos-delay="${delay}"
            style="background:var(--color-white); border-radius:4px; box-shadow:0 15px 40px rgba(0,0,0,0.04); padding:50px; margin-bottom:40px; text-align:center;">
            ${estadoBadge}
            <h3 style="font-size:1.5rem; margin-bottom:10px;">${esc(p.nombre)}</h3>
            <h5 class="accent-gold" style="margin-bottom:20px; font-weight:500;">${esc(p.ubicacion)}</h5>
            <p style="margin-bottom:30px; color:var(--color-text-muted); max-width:700px; margin-left:auto; margin-right:auto;">${esc(p.descripcion)}</p>
            ${datosHTML}
            ${botonesHTML}
            ${featuresSection}
        </div>
    `;
}

// El botón "Consultar" de cada tarjeta deja el proyecto pre-seleccionado en el formulario
function preseleccionarProyecto(id) {
    const select = document.getElementById('lead-proyecto');
    if (select) select.value = id;
}
