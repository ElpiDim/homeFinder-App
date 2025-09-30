import re
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    # Use two browser contexts to simulate two different users
    browser = playwright.chromium.launch(headless=True)
    owner_context = browser.new_context()
    tenant_context = browser.new_context()

    owner_page = owner_context.new_page()
    tenant_page = tenant_context.new_page()

    # Common variables
    base_url = "http://localhost:3000"
    owner_email = "owner@example.com"
    owner_password = "password123"
    tenant_email = "tenant@example.com"
    tenant_password = "password123"
    property_title = "Test Property for Chat"
    initial_message = "Hello, I'm interested in this property."
    owner_reply = "Hello, thanks for your interest!"

    try:
        # --- Owner Registration ---
        owner_page.goto(f"{base_url}/register")
        owner_page.locator('input[name="email"]').fill(owner_email)
        owner_page.locator('input[name="password"]').fill(owner_password)
        owner_page.locator('select[name="role"]').select_option("owner")
        owner_page.get_by_role("button", name="Register").click()

        # --- Owner Login ---
        owner_page.goto(f"{base_url}/login")
        owner_page.locator('input[name="email"]').fill(owner_email)
        owner_page.locator('input[name="password"]').fill(owner_password)
        owner_page.get_by_role("button", name="Login").click()
        expect(owner_page.get_by_role("heading", name="Dashboard")).to_be_visible()

        # --- Owner Creates Property ---
        owner_page.get_by_role("link", name="Add Property").click()
        owner_page.locator('input[name="title"]').fill(property_title)
        owner_page.locator('textarea[name="description"]').fill("A nice place to live.")
        owner_page.locator('input[name="rent"]').fill("1200")
        owner_page.locator('input[name="bedrooms"]').fill("3")
        owner_page.locator('input[name="bathrooms"]').fill("2")
        owner_page.get_by_role("button", name="Add Property").click()
        expect(owner_page.get_by_role("heading", name=re.compile(property_title, re.IGNORECASE))).to_be_visible()

        # --- Tenant Registration ---
        tenant_page.goto(f"{base_url}/register")
        tenant_page.locator('input[name="email"]').fill(tenant_email)
        tenant_page.locator('input[name="password"]').fill(tenant_password)
        tenant_page.locator('select[name="role"]').select_option("client")
        tenant_page.get_by_role("button", name="Register").click()

        # --- Tenant Login ---
        tenant_page.goto(f"{base_url}/login")
        tenant_page.locator('input[name="email"]').fill(tenant_email)
        tenant_page.locator('input[name="password"]').fill(tenant_password)
        tenant_page.get_by_role("button", name="Login").click()
        expect(tenant_page.get_by_role("heading", name="Dashboard")).to_be_visible()

        # --- Tenant Finds Property and Sends Message ---
        tenant_page.get_by_role("link", name=re.compile(property_title, re.IGNORECASE)).first.click()
        tenant_page.get_by_role("button", name="Contact Owner").click()
        expect(tenant_page.get_by_role("heading", name="Conversation")).to_be_visible()
        tenant_page.get_by_placeholder("Type your message...").fill(initial_message)
        tenant_page.get_by_role("button", name="Send").click()
        expect(tenant_page.get_by_text(initial_message)).to_be_visible()

        # --- Owner Navigates to Messages and Replies ---
        owner_page.get_by_role("link", name="Messages").click()
        owner_page.get_by_text(re.compile(property_title, re.IGNORECASE)).first.click()
        expect(owner_page.get_by_text(initial_message)).to_be_visible()
        owner_page.get_by_placeholder("Type your message...").fill(owner_reply)
        owner_page.get_by_role("button", name="Send").click()
        expect(owner_page.get_by_text(owner_reply)).to_be_visible()

        # --- Tenant Checks for Real-Time Reply ---
        expect(tenant_page.get_by_text(owner_reply)).to_be_visible(timeout=5000)

        # --- Screenshot for Verification ---
        tenant_page.screenshot(path="jules-scratch/verification/real-time-chat.png")

        print("Verification script completed successfully.")

    finally:
        owner_context.close()
        tenant_context.close()
        browser.close()

if __name__ == "__main__":
    with sync_playwright() as p:
        run(p)