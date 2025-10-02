// ==UserScript==
// @name         Automágic IVA SRI (Full PrimeFaces)
// @namespace    https://github.com/LuisS26/automagic-iva-sri
// @version      4.6
// @description  Marca facturas y selecciona tipo de gasto (PrimeFaces UI) en todas las páginas del SRI de Ecuador
// @author       Luis Steeven Vega Roldán - Ing. en Tecnologías de la Información
// @license      MIT
// @copyright    2025, Luis Steeven Vega Roldán
// @contact      vegaluis200026@gmail.com | linkedin.com/in/luis-vega-baa838324
// @match        *://*.sri.gob.ec/*
// @grant        none
// ==/UserScript==

/*
------------------------------------------------------------------------------------
  Automágic IVA SRI (Full PrimeFaces)
  Userscript para automatizar la devolución del IVA en el SRI de Ecuador.
  Marca facturas y selecciona automáticamente el tipo de gasto en todas las páginas,
  compatible con interfaces PrimeFaces UI.
  © 2025, Luis Steeven Vega Roldán | Licencia MIT
  Repositorio: https://github.com/LuisS26/automagic-iva-sri
------------------------------------------------------------------------------------
*/

const CATEGORY_MAP = {
    alimentación:    ["super", "mercado", "almacen", "comisariato", "tuti", "tia", "aki", "supermaxi", "casanova", "mi", "favorita"],
    comunicación:    ["telefono", "internet", "movistar", "claro", "etapa", "celulares", "cell", "alfanet"],
    cultura:         ["teatro", "cine", "museo", "importadora"],
    deporte:         ["gimnasio", "depor", "boliche"],
    educación:       ["colegio", "curso", "academia"],
    salud:           ["farmacia", "hospital", "clinica", "salud", "FUXION", "C.A.S."],
    "transporte y movilidad": ["uber", "taxi", "metro", "bus", "movilidad", "transporte", "servicios", "estacion"],
    vestimenta:      ["ropa", "zapat", "vestimenta", "calzado", "darmacio", "marathon", "moda", "store"],
    vivienda:        ["alquiler", "arriendo", "vivienda", "arrendamiento", "GYPSUM"],
    otros:           []
};

function classify(name) {
    const txt = name.toLowerCase();
    for (const [cat, keys] of Object.entries(CATEGORY_MAP))
        if (keys.some(k => txt.includes(k))) return cat;
    return "otros";
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
function waitFor(fn, timeout = 8000, interval = 120) {
    const t0 = Date.now();
    return new Promise((resolve, reject) => {
        (function loop() {
            let res;
            try { res = fn(); } catch { }
            if (res) return resolve(res);
            if (Date.now() - t0 > timeout) return reject('Timeout');
            setTimeout(loop, interval);
        })();
    });
}

// Inserta botón flotante
(function () {
    'use strict';
    if (window._ivaBtn) return;
    const btn = document.createElement('button');
    btn.textContent = "🪄 Automágic IVA";
    btn.style.position = "fixed";
    btn.style.top = "90px";
    btn.style.right = "18px";
    btn.style.zIndex = "99999";
    btn.style.padding = "8px 14px";
    btn.style.background = "#1565c0";
    btn.style.color = "#fff";
    btn.style.borderRadius = "8px";
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.onclick = runAutoIva;
    document.body.appendChild(btn);
    window._ivaBtn = btn;
})();

async function runAutoIva() {
    window._ivaBtn.disabled = true;
    let page = 1;
    while (true) {
        console.log(`📄 Procesando página ${page}...`);
        let rows = Array.from(document.querySelectorAll("table tbody tr")).filter(
            row => row.querySelectorAll('td').length >= 9
        );
        for (const r of rows) {
            try {
                // a) Marca checkbox si no está marcado
                const chk = r.querySelector("input[type=checkbox], .ui-chkbox-box");
                if (chk && !chk.checked && chk.click) {
                    chk.scrollIntoView({block: "center"});
                    chk.click();
                } else if (chk && chk.classList && chk.classList.contains('ui-chkbox-box')) {
                    chk.scrollIntoView({block: "center"});
                    chk.click();
                }
                // b) Espera a que menú esté habilitado
                await waitFor(() => {
                    const menu = r.querySelector(".ui-selectonemenu");
                    return menu && !menu.classList.contains("ui-state-disabled");
                }, 3000);

                // c) Abrir menú
                const trigger = r.querySelector(".ui-selectonemenu-trigger");
                if (!trigger) throw "No trigger selectonemenu";
                trigger.click();
                await wait(200);

                // d) Buscar UL del menú flotante
                const opts = await waitFor(() => {
                    return Array.from(document.querySelectorAll("ul.ui-selectonemenu-list"))
                        .find(u => u.offsetParent !== null && u.querySelectorAll('li').length > 0);
                }, 2500);

                // e) Buscar opción por texto
                const proveedor = r.querySelector("td:nth-child(3)")?.innerText || "";
                const categoria = classify(proveedor);
                const li = Array.from(opts.querySelectorAll("li")).find(
                    el => el.innerText.trim().toLowerCase() === categoria
                );
                if (!li) throw "No opción: " + categoria;
                li.scrollIntoView({block: "center"});
                li.click();
                await wait(180);

            } catch (e) {
                console.warn("⚠️ Fila skip:", e, r);
            }
        }

        // --- Cambio de página robusto ---
        // PrimeFaces: botón "Página siguiente" tiene clase .ui-paginator-next y se deshabilita con .ui-state-disabled
        const next = document.querySelector("a.ui-paginator-next:not(.ui-state-disabled)");
        if (next) {
            next.click();
            page++;
            // Espera a que cargue la siguiente página (el número de la primera factura cambia)
            // Busca el "No." de la primera fila, espera que cambie
            let prevNo = rows[0]?.querySelector("td")?.innerText || "";
            await waitFor(() => {
                let currNo = document.querySelector("table tbody tr td")?.innerText || "";
                return currNo !== prevNo;
            }, 8000).catch(()=>{});
            await wait(300); // margen extra de seguridad
        } else break;
    }
    alert("✅ Proceso completado. Revisa los datos y envía cuando estés listo.");
    window._ivaBtn.disabled = false;
}

/*
MIT License

Copyright (c) 2025 Luis Steeven Vega Roldán

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
