const { test, expect, beforeEach, describe } = require('@playwright/test');
const { loginWith, createBlog } = require('./helper.cjs');

describe('Blog app', () => {
  beforeEach(async ({ page, request }) => {
    await request.post('/api/testing/reset');
    await request.post('/api/users', {
      data: {
        name: 'Matti Luukkainen',
        username: 'mluukkai',
        password: 'salainen'
      }
    });

      await page.goto('/');
    });

  test('Login form is shown', async ({ page }) => {
    await page.goto('/');

    const locator = await page.getByText('Blogs');
    await expect(locator).toBeVisible();
    await expect(page.getByText('Blog app, Department of Computer Science, University of Helsinki 2024')).toBeVisible();
  });

  describe('Login', () => {
    test('succeeds with correct credentials', async ({ page }) => {
      await page.getByRole('button', { name: 'login' }).click();
      await page.getByTestId('username').fill('mluukkai');
      await page.getByTestId('password').fill('salainen');
      await page.getByRole('button', { name: 'login' }).click();

      await expect(page.getByText('Matti Luukkainen logged in')).toBeVisible();
    });

    test('fails with wrong credentials', async ({ page }) => {
      await page.getByRole('button', { name: 'login' }).click();
      await page.getByTestId('username').fill('mluukkai');
      await page.getByTestId('password').fill('wrong');
      await page.getByRole('button', { name: 'login' }).click();

      const errorMessage = page.getByText('wrong username or password');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toHaveCSS('border-style', 'solid');
      await expect(errorMessage).toHaveCSS('color', 'rgb(255, 0, 0)'); // 'red' in RGB format

      await expect(page.getByText('Matti Luukkainen logged in')).not.toBeVisible();
    });
  });

  test.describe.configure({ mode: 'serial' });

  describe('When logged in', () => {
    beforeEach(async ({ page, request }) => {
      await loginWith(page, 'mluukkai', 'salainen');

      // // When creating the blog using mock data
      await createBlog(page, 'a note created by playwright7', 'jabs7', 'www.consistency_leads_to_conviction.com', '95');
      await createBlog(page, 'a note created by playwright8', 'jabs8', 'www.consistency_leads_to_conviction.com8', '100');
      await createBlog(page, 'a note created by playwright6', 'jabs6', 'www.consistency_leads_to_conviction.com', '90');
    });

    test('a blog can be deleted', async ({ page }) => {
      const card = page.getByTestId('blog-a note created by playwright7');
       // Listen for the confirm dialog and accept it
      page.once('dialog', async dialog => {
        expect(dialog.message()).toBe('Are you sure you want to delete a note created by playwright7 by jabs7?');
        await dialog.accept();
      });

      await card.getByRole('button', { name: 'show' }).click()
       // Find the delete button within the same blog container
      await card.getByRole('button', { name: 'delete' }).click()

       // Verify the blog is no longer visible
       await expect(page.getByText('SUCCESSFULLY DELETED!')).toBeVisible();
       await expect(page.getByText('Title: a note created by playwright7')).not.toBeVisible();
    });

    test('blogs are ordered by number of likes from highest to lowest', async ({ page }) => {
      await page.waitForSelector('.blog');

      const showButtons = await page.getByRole('button', { name: 'show' }).all();
      for (const btn of showButtons) {
        await btn.click();
      }

      const blogs = await page.locator('.blog').all();

      const likesArray = await Promise.all(
        blogs.map(async (blog) => {
          const text = await blog.textContent();
          const match = text.match(/Likes:\s*(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })
      );

      const sortedLikes = [...likesArray].sort((a, b) => b - a);
      expect(likesArray).toEqual(sortedLikes);
    });
  });
});