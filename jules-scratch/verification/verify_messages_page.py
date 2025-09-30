import time
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Generate a unique email for registration
    unique_email = f"testuser_{int(time.time())}@example.com"

    # Register a new user
    page.goto("http://localhost:3000/register")
    page.get_by_label("Email").fill(unique_email)
    page.get_by_label("Password").fill("password123")
    page.get_by_label("Role").select_option("client")
    page.get_by_role("button", name="Register").click()

    # Wait for navigation to complete after registration
    expect(page).to_have_url("http://localhost:3000/onboarding", timeout=10000)

    # Log in with the new user
    page.goto("http://localhost:3000/login")
    page.get_by_label("Email address").fill(unique_email)
    page.get_by_label("Password").fill("password123")
    page.get_by_role("button", name="Login").click()

    # Wait for navigation to the dashboard
    expect(page).to_have_url("http://localhost:3000/dashboard", timeout=10000)

    # Navigate to the messages page
    page.goto("http://localhost:3000/messages")

    # Wait for the conversations to load
    expect(page.get_by_role("heading", name="Conversations")).to_be_visible()

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/messages_page.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)