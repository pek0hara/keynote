from playwright.sync_api import sync_playwright

def verify_pass_button():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8080")

        # Start game
        page.click("#start-game-btn")

        # Wait for game screen
        page.wait_for_selector("#game-screen.active")

        # Wait for Pass button
        pass_btn = page.wait_for_selector("#pass-question-btn")

        # Check if visible
        if pass_btn.is_visible():
            print("Pass button is visible.")
        else:
            print("Pass button is NOT visible.")

        # Check if answer buttons are hidden
        # .answer-section should have 'hidden' class
        answer_section = page.locator(".answer-section")
        # Check class attribute
        classes = answer_section.get_attribute("class")
        if "hidden" in classes:
             print("Answer section is hidden.")
        else:
             print(f"Answer section is visible (classes: {classes})")

        # Take screenshot of the game controls area
        page.screenshot(path="verification/pass_button.png")

        browser.close()

if __name__ == "__main__":
    verify_pass_button()
