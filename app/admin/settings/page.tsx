'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSettings, updateSetting } from '@/lib/supabase';
import { toast } from 'sonner';

export default function AdminSettingsPage(): JSX.Element {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [settings, setSettings] = useState({
    store_name: '',
    announcement_1: '',
    announcement_2: '',
    announcement_3: '',
    contact_email: '',
    social_instagram: '',
    social_facebook: '',
    social_tiktok: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async (): Promise<void> => {
    try {
      const data = await getSettings(1);
      setSettings({
        store_name: data.store_name || '',
        announcement_1: data.announcement_1 || '',
        announcement_2: data.announcement_2 || '',
        announcement_3: data.announcement_3 || '',
        contact_email: data.contact_email || '',
        social_instagram: data.social_instagram || '',
        social_facebook: data.social_facebook || '',
        social_tiktok: data.social_tiktok || '',
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    setSettings((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const promises = Object.entries(settings).map(([key, value]) =>
        updateSetting(key, value, 1)
      );

      await Promise.all(promises);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#1E3A5F] mb-8">Store Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Configure your store name and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="store_name" className="block text-sm font-medium text-gray-700 mb-1">
                Store Name
              </label>
              <Input
                id="store_name"
                name="store_name"
                value={settings.store_name}
                onChange={handleChange}
                placeholder="LuxeHaven"
                required
              />
            </div>

            <div>
              <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email
              </label>
              <Input
                id="contact_email"
                name="contact_email"
                type="email"
                value={settings.contact_email}
                onChange={handleChange}
                placeholder="hello@luxehaven.com"
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Announcement Bar Messages</CardTitle>
            <CardDescription>
              These messages rotate every 4 seconds on the homepage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="announcement_1" className="block text-sm font-medium text-gray-700 mb-1">
                Message 1
              </label>
              <Textarea
                id="announcement_1"
                name="announcement_1"
                value={settings.announcement_1}
                onChange={handleChange}
                placeholder="Free Shipping on Orders Over $50"
                rows={2}
                required
              />
            </div>

            <div>
              <label htmlFor="announcement_2" className="block text-sm font-medium text-gray-700 mb-1">
                Message 2
              </label>
              <Textarea
                id="announcement_2"
                name="announcement_2"
                value={settings.announcement_2}
                onChange={handleChange}
                placeholder="UK Orders: No Customs Fees"
                rows={2}
                required
              />
            </div>

            <div>
              <label htmlFor="announcement_3" className="block text-sm font-medium text-gray-700 mb-1">
                Message 3
              </label>
              <Textarea
                id="announcement_3"
                name="announcement_3"
                value={settings.announcement_3}
                onChange={handleChange}
                placeholder="New Arrivals Every Day"
                rows={2}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Social Media Links</CardTitle>
            <CardDescription>
              Update your social media profile URLs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="social_instagram" className="block text-sm font-medium text-gray-700 mb-1">
                Instagram URL
              </label>
              <Input
                id="social_instagram"
                name="social_instagram"
                type="url"
                value={settings.social_instagram}
                onChange={handleChange}
                placeholder="https://instagram.com/luxehaven"
              />
            </div>

            <div>
              <label htmlFor="social_facebook" className="block text-sm font-medium text-gray-700 mb-1">
                Facebook URL
              </label>
              <Input
                id="social_facebook"
                name="social_facebook"
                type="url"
                value={settings.social_facebook}
                onChange={handleChange}
                placeholder="https://facebook.com/luxehaven"
              />
            </div>

            <div>
              <label htmlFor="social_tiktok" className="block text-sm font-medium text-gray-700 mb-1">
                TikTok URL
              </label>
              <Input
                id="social_tiktok"
                name="social_tiktok"
                type="url"
                value={settings.social_tiktok}
                onChange={handleChange}
                placeholder="https://tiktok.com/@luxehaven"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="submit"
            className="bg-[#2E86AB] hover:bg-[#1E3A5F] text-white"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={loadSettings}
            disabled={isSaving}
          >
            Reset
          </Button>
        </div>
      </form>
    </div>
  );
}
