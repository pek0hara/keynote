import os
import time
from playwright.sync_api import sync_playwright

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Assume server is running on 8000
        page.goto("http://localhost:8000")

        # Click Maracas button
        maracas_btn = page.locator("#btn-maracas")
        maracas_btn.click()

        # Click Start Game
        start_btn = page.locator("#start-game-btn")
        start_btn.click()

        # Wait for game screen
        page.wait_for_selector("#game-screen.active")

        # Take screenshot of initial Maracas mode
        page.screenshot(path="verification_maracas_start.png")

        # Click Start (in Maracas mode, play button starts the session)
        play_btn = page.locator("#play-sound-btn")
        play_btn.click()

        time.sleep(1) # Wait for metronome

        # Click Shake
        shake_pad = page.locator("#maracas-pad")
        shake_pad.click()

        time.sleep(0.5)

        # Take screenshot with feedback
        page.screenshot(path="verification_maracas_action.png")

        browser.close()

if __name__ == "__main__":
    run_verification()
