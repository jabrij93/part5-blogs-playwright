const { test, expect, beforeEach, describe } = require('@playwright/test');
const { loginWith, createBlog } = require('./helper.cjs');
const { create } = require('domain');

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

  describe('When logged in', () => {
    beforeEach(async ({ page }) => {
      await loginWith(page, 'mluukkai', 'salainen');
      
      // When creating the blog using mock data
      await createBlog(page, 'a note created by playwright7', 'jabs7', 'www.consistency_leads_to_conviction.com', '95');
      await createBlog(page, 'a note created by playwright8', 'jabs8', 'www.consistency_leads_to_conviction.com8', '100');
      await createBlog(page, 'a note created by playwright6', 'jabs6', 'www.consistency_leads_to_conviction.com', '90');
    });

    test('a blog can be deleted', async ({ page }) => {
       // Listen for the confirm dialog and accept it
       page.on('dialog', dialog => dialog.accept());
      
       const blogContainer = await page.locator('div.blog', { hasText: 'Title: a note created by playwright6' });

       // Within that blog container, find and click the "show" button
       const showButton = blogContainer.getByRole('button', { name: 'show' });
       await showButton.click();

       // Find the delete button within the same blog container
       const deleteButton = blogContainer.getByRole('button', { name: 'delete' });
       await expect(deleteButton).toBeVisible();
  
       // Delete the blog
       await deleteButton.click();

       // Verify the blog is no longer visible
       await expect(page.getByText('Title: a note created by playwright6')).not.toBeVisible();
    });

    test.only('blog order is from high likes to low likes', async ({ page }) => {
      const firstBlogContainer = await page.locator('div.blog').nth(0);
      const displayFirstBlog = await firstBlogContainer.getByText('a note created by playwright8');
      await expect(displayFirstBlog).toBeVisible();

      const secondBlogContainer = await page.locator('div.blog').nth(1);
      const displaySecondBlog = await secondBlogContainer.getByText('a note created by playwright7');
      await expect(displaySecondBlog).toBeVisible();

      const thirdBlogContainer = await page.locator('div.blog').nth(2);
      const displayThirdBlog = await thirdBlogContainer.getByText('a note created by playwright6');
      await expect(displayThirdBlog).toBeVisible();
     });
  });
});
