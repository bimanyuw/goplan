import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('public pages have accessible structure and no automatic tracking or embeds', async ({ page }) => {
  const hosts = new Set<string>();
  page.on('request', r => hosts.add(new URL(r.url()).hostname));
  await page.goto('/');
  await expect(page.getByRole('heading', { name:'Masuk ke GoPlan' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link',{name:'Lewati ke konten utama'})).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  await expect(page.locator('iframe,img,script[src*="analytics"],script[src*="gtag"]')).toHaveCount(0);
  expect(await page.context().cookies()).toEqual([]);
  expect(await page.evaluate(()=>Object.keys(localStorage))).toEqual([]);
  expect([...hosts]).toEqual(['localhost']);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
});
test('signup has explicit unchecked consent and clear keyboard-friendly labels', async ({page})=>{
  await page.goto('/'); await page.getByRole('button',{name:'Belum punya akun? Daftar'}).click();
  await expect(page.getByRole('heading',{name:'Buat akun GoPlan'})).toBeFocused();
  const boxes=page.getByRole('checkbox'); await expect(boxes).toHaveCount(3);
  for(const box of await boxes.all()) await expect(box).not.toBeChecked();
  await page.getByLabel('Email',{exact:true}).fill('student@example.invalid');
  await page.getByLabel('Kata sandi',{exact:true}).fill('a-safe-test-password');
  await page.getByRole('button',{name:'Buat akun gratis'}).click();
  expect(await boxes.first().evaluate((e:HTMLInputElement)=>e.validity.valueMissing)).toBe(true);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
});
test('all policy pages are readable on a narrow screen without overflow',async({page})=>{
  await page.setViewportSize({width:320,height:800});
  for(const path of ['/privacy','/terms','/refund','/cookies','/about','/accessibility']){
    await page.goto(path); await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path).toBe(true);
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations,path).toEqual([]);
  }
});
test('security headers restrict external embeds and referrer leakage',async({request})=>{
  const response=await request.get('/');const headers=response.headers();
  expect(headers['x-frame-options']).toBe('DENY');expect(headers['referrer-policy']).toBe('no-referrer');
  expect(headers['content-security-policy']).toContain("frame-src 'none'");
  expect(headers['permissions-policy']).toContain('geolocation=()');
});
