"""Offline Windows shell for the Fairytale Lab. No Python API is exposed to pages."""
from __future__ import annotations

import argparse
import ctypes
import json
import logging
import os
from pathlib import Path
import sys
import tempfile
import time


def resource_root() -> Path:
    return Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))


def run() -> None:
    parser = argparse.ArgumentParser(description="童话实验室 · 离线教学实验")
    parser.add_argument("--smoke-test", metavar="RESULT_JSON", help="Run the desktop integration test and exit")
    args = parser.parse_args()
    app_data = Path(os.getenv("LOCALAPPDATA", tempfile.gettempdir())) / "FairytaleLab"
    app_data.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(filename=app_data / "desktop.log", level=logging.INFO, encoding="utf-8")
    logging.info("Starting FairytaleLab 2.0.0")
    try:
        import webview

        webview.settings["ALLOW_DOWNLOADS"] = True
        webview.settings["OPEN_EXTERNAL_LINKS_IN_BROWSER"] = True
        window = webview.create_window(
            "童话实验室 · 动手发现科学",
            url=str(resource_root() / "web" / "index.html"),
            width=1460, height=1000, min_size=(1000, 720),
            background_color="#f1f5f7", text_select=False,
            hidden=False,
        )

        def smoke_test() -> None:
            result = {"ok": False, "version": "2.0.0", "engine": "edgechromium", "test": "two-experiment-desktop-integration"}
            try:
                deadline = time.monotonic() + 55
                while time.monotonic() < deadline:
                    if window.evaluate_js("typeof window.LabShell === 'object'"):
                        break
                    time.sleep(0.2)
                else:
                    raise TimeoutError("The experiment shell did not initialize")
                result["title"] = window.evaluate_js("document.title")
                result["catalog"] = window.evaluate_js("window.LabShell.snapshot()")
                frame = "document.getElementById('experimentFrame').contentWindow"
                while time.monotonic() < deadline:
                    if window.evaluate_js(f"typeof {frame}.ShadowLab === 'object'"):
                        break
                    time.sleep(0.2)
                else:
                    raise TimeoutError("The Three.js scene failed to initialize")
                initial = window.evaluate_js(f"{frame}.ShadowLab.snapshot()")
                window.evaluate_js(f"{frame}.document.querySelector('[data-preset=near-light]').click()")
                near = window.evaluate_js(f"{frame}.ShadowLab.snapshot()")
                window.evaluate_js(f"{frame}.document.querySelector('[data-preset=near-ground]').click()")
                far = window.evaluate_js(f"{frame}.ShadowLab.snapshot()")
                if not (near['metrics']['magnification'] > initial['metrics']['magnification'] > far['metrics']['magnification']):
                    raise AssertionError("Shadow projection did not respond to hand height")
                result['shadow'] = {"renderer": initial['renderer'], "initialMagnification": initial['metrics']['magnification'], "nearLightMagnification": near['metrics']['magnification'], "nearGroundMagnification": far['metrics']['magnification']}
                window.evaluate_js("window.LabShell.openExperiment('mouse-strongman')")
                while time.monotonic() < deadline:
                    if window.evaluate_js(f"typeof {frame}.FairytaleLab === 'object'"):
                        break
                    time.sleep(0.2)
                else:
                    raise TimeoutError("The first experiment did not load")
                window.evaluate_js(f"{frame}.document.getElementById('quickBuildBtn').click()")
                while time.monotonic() < deadline:
                    snap = window.evaluate_js(f"{frame}.FairytaleLab.snapshot()")
                    if len(snap["installed"]) == 11 and snap["leverDone"] and window.evaluate_js(f"!{frame}.document.getElementById('mainAction').disabled"):
                        break
                    time.sleep(0.2)
                else:
                    raise TimeoutError("Quick assembly did not finish")
                window.evaluate_js(f"{frame}.document.getElementById('mainAction').click(); for(let i=0;i<11;i++) {frame}.document.getElementById('addBtn').click()")
                while time.monotonic() < deadline:
                    snap = window.evaluate_js(f"{frame}.FairytaleLab.snapshot()")
                    if snap["everGold"]:
                        break
                    time.sleep(0.1)
                else:
                    raise TimeoutError("The counterweight failed to lift the stone")
                result.update(ok=True, installed=len(snap["installed"]), pebbles=snap["count"], heightCm=snap["height"], reachedGold=snap["everGold"])
            except Exception as exc:
                logging.exception("Desktop smoke test failed")
                result["error"] = str(exc)
                try:
                    result['diagnostics'] = window.evaluate_js("({url:location.href,title:document.title,shell:typeof window.LabShell,catalog:typeof window.EXPERIMENT_CATALOG,text:document.body.innerText.slice(0,600),scripts:[...document.scripts].map(s=>s.src)})")
                except Exception:
                    pass
            finally:
                Path(args.smoke_test).resolve().write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
                window.destroy()

        if args.smoke_test:
            # Keep integration tests separate from the learner's saved experiment.
            with tempfile.TemporaryDirectory(prefix="FairytaleLab-test-", ignore_cleanup_errors=True) as profile:
                webview.start(smoke_test, gui="edgechromium", private_mode=False, storage_path=profile)
        else:
            webview.start(gui="edgechromium", private_mode=False, storage_path=str(app_data / "WebView2"))
    except Exception:
        logging.exception("Desktop startup failed")
        if args.smoke_test:
            Path(args.smoke_test).resolve().write_text(json.dumps({"ok": False, "error": "Desktop startup failed; see desktop.log"}), encoding="utf-8")
        else:
            ctypes.windll.user32.MessageBoxW(
                0,
                "桌面窗口暂时无法启动。请确认已安装 Microsoft Edge WebView2 Runtime。\n\n"
                "也可直接打开随附的 web/index.html 使用离线网页版。\n"
                f"诊断日志：{app_data / 'desktop.log'}",
                "童话实验室 · 启动提示", 0x10,
            )
        raise


if __name__ == "__main__":
    run()
