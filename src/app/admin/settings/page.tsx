'use client';

import React, { useState } from 'react';
import {
  Store,
  Truck,
  CreditCard,
  Bell,
  Gift,
  RotateCcw,
  Search,
  Link as LinkIcon,
  Shield,
  Save,
  ChevronRight,
  Check,
  Flag,
  Megaphone,
  Home,
} from 'lucide-react';
import {
  getStoreSettings,
  updateStoreSettings,
  getHomepageSettings,
  updateHomepageSettings,
  getStoreIdentitySettings,
  updateStoreIdentitySettings,
  getShippingSettings,
  updateShippingSettings,
  getLoyaltySettings,
  updateLoyaltySettings,
  getReturnsSettings,
  updateReturnsSettings,
  getIntegrationSettings,
  updateIntegrationSettings,
  getPaymentSettings,
  updatePaymentSettings,
  getNotificationSettings,
  updateNotificationSettings,
} from '../actions/settings';
import { quickSendEmail } from '../actions/marketing';

const SECTIONS = [
  { id: 'store', icon: Store, label: 'Store Information' },
  { id: 'homepage', icon: Home, label: 'Homepage Content' },
  { id: 'marketing', icon: Megaphone, label: 'Marketing & Brevo' },
  { id: 'shipping', icon: Truck, label: 'Shipping Settings' },
  { id: 'payment', icon: CreditCard, label: 'Payment Settings' },
  { id: 'notifications', icon: Bell, label: 'Notification Templates' },
  { id: 'loyalty', icon: Gift, label: 'Loyalty & Rewards' },
  { id: 'returns', icon: RotateCcw, label: 'Return & Refund Policy' },
  { id: 'integrations', icon: LinkIcon, label: 'Integrations' },
  { id: 'banner', icon: Flag, label: 'Banner & Design' },
  { id: 'security', icon: Shield, label: 'Security' },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#131726]">
      <div className="border-b border-white/5 px-5 py-4">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="space-y-5 p-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-slate-600">{hint}</p>}
    </div>
  );
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-600 transition-all focus:outline-none focus:ring-1 focus:ring-emerald-500"
    />
  );
}

function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-medium text-slate-200">{label}</p>
        {hint && <p className="mt-0.5 text-[10px] text-slate-600">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`h-5.5 relative w-10 flex-shrink-0 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-white/10'}`}
        style={{ height: '22px', width: '40px' }}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[18px]' : ''}`}
        />
      </button>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [activeSection, setActiveSection] = useState('store');
  const [saved, setSaved] = useState(false);

  // Store settings
  const [storeName, setStoreName] = useState('Ruhvi Fine Jewellery');
  const [storeEmail, setStoreEmail] = useState('support@ruhvi.in');
  const [storePhone, setStorePhone] = useState('+91-');
  const [gstNumber, setGstNumber] = useState('');
  const [storeAddress, setStoreAddress] = useState('');

  // Banner Settings
  const [bannerEnabled, setBannerEnabled] = useState(true);
  const [bannerText, setBannerText] = useState(
    'Complimentary Insured Shipping on all orders above ₹5000'
  );
  const [bannerColor, setBannerColor] = useState(
    'bg-gradient-to-r from-fuchsia-600 to-purple-600'
  );
  const [bannerLink, setBannerLink] = useState('');

  // Marketing Tasks
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: '',
    htmlContent: '',
  });
  const [isSending, setIsSending] = useState(false);

  // Homepage Settings
  const [homepageSettings, setHomepageSettings] = useState({
    hero_title: '',
    hero_image_url: '',
    hero_cta1_text: '',
    hero_cta1_link: '',
    hero_cta2_text: '',
    hero_cta2_link: '',
    lifestyle_title: '',
    lifestyle_text: '',
    lifestyle_image_url: '',
    lifestyle_cta_text: '',
    lifestyle_cta_link: '',
    why_ruhvi_title: '',
    why_ruhvi_text: '',
    why_ruhvi_cta_text: '',
    why_ruhvi_cta_link: '',
  });

  React.useEffect(() => {
    async function loadSettings() {
      const data = await getStoreSettings();
      if (data) {
        setBannerEnabled(data.banner_enabled);
        setBannerText(data.banner_text || '');
        setBannerColor(
          data.banner_color || 'bg-gradient-to-r from-fuchsia-600 to-purple-600'
        );
        setBannerLink(data.banner_link || '');
      }

      const identity = await getStoreIdentitySettings();
      if (identity) {
        setStoreName(identity.store_name || 'Ruhvi Fine Jewellery');
        setStoreEmail(identity.store_email || 'support@ruhvi.in');
        setStorePhone(identity.store_phone || '+91-');
        setGstNumber(identity.gst_number || '');
        setStoreAddress(identity.store_address || '');
      }

      const ship = await getShippingSettings();
      if (ship) {
        setFreeShippingThreshold(
          ship.free_shipping_threshold !== undefined
            ? String(ship.free_shipping_threshold)
            : '500'
        );
        setCodCharge(
          ship.cod_charge !== undefined ? String(ship.cod_charge) : '49'
        );
        setCodEnabled(ship.cod_enabled ?? true);
        setPickupAddress(ship.pickup_address || '');
      }

      const loyalty = await getLoyaltySettings();
      if (loyalty) {
        setCoinsPerRupee(
          loyalty.coins_per_rupee !== undefined
            ? String(loyalty.coins_per_rupee)
            : '1'
        );
        setMinRedeem(
          loyalty.min_redeem !== undefined ? String(loyalty.min_redeem) : '100'
        );
        setCoinsExpiry(
          loyalty.coins_expiry !== undefined
            ? String(loyalty.coins_expiry)
            : '12'
        );
      }

      const returns = await getReturnsSettings();
      if (returns) {
        setReturnWindow(
          returns.return_window !== undefined
            ? String(returns.return_window)
            : '7'
        );
        setAutoApprove(returns.auto_approve ?? false);
        setAutoApproveLimit(
          returns.auto_approve_limit !== undefined
            ? String(returns.auto_approve_limit)
            : '500'
        );
      }

      const integrations = await getIntegrationSettings();
      if (integrations) {
        setGa4Id(integrations.ga4_id || 'G-7LY7LND9S9');
        setMetaPixelId(integrations.meta_pixel_id || '');
        setClarityId(integrations.clarity_id || '');
      }

      const payment = await getPaymentSettings();
      if (payment) {
        setPhonepeEnabled(payment.phonepe_enabled ?? true);
      }

      const notifications = await getNotificationSettings();
      if (notifications) {
        setEmailEnabled(notifications.email_enabled ?? true);
        setWhatsappEnabled(notifications.whatsapp_enabled ?? false);
        setNotifSenderEmail(notifications.sender_email || 'marketing@ruhvi.in');
        setNotifSenderName(notifications.sender_name || 'Ruhvi');
      }

      const hp = await getHomepageSettings();
      if (hp) {
        setHomepageSettings({
          hero_title: hp.hero_title || '',
          hero_image_url: hp.hero_image_url || '',
          hero_cta1_text: hp.hero_cta1_text || '',
          hero_cta1_link: hp.hero_cta1_link || '',
          hero_cta2_text: hp.hero_cta2_text || '',
          hero_cta2_link: hp.hero_cta2_link || '',
          lifestyle_title: hp.lifestyle_title || '',
          lifestyle_text: hp.lifestyle_text || '',
          lifestyle_image_url: hp.lifestyle_image_url || '',
          lifestyle_cta_text: hp.lifestyle_cta_text || '',
          lifestyle_cta_link: hp.lifestyle_cta_link || '',
          why_ruhvi_title: hp.why_ruhvi_title || '',
          why_ruhvi_text: hp.why_ruhvi_text || '',
          why_ruhvi_cta_text: hp.why_ruhvi_cta_text || '',
          why_ruhvi_cta_link: hp.why_ruhvi_cta_link || '',
        });
      }
    }
    loadSettings();
  }, []);

  // Shipping
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('500');
  const [codCharge, setCodCharge] = useState('49');
  const [codEnabled, setCodEnabled] = useState(true);
  const [pickupAddress, setPickupAddress] = useState('');

  // Loyalty
  const [coinsPerRupee, setCoinsPerRupee] = useState('1');
  const [minRedeem, setMinRedeem] = useState('100');
  const [coinsExpiry, setCoinsExpiry] = useState('12');

  // Returns
  const [returnWindow, setReturnWindow] = useState('7');
  const [autoApprove, setAutoApprove] = useState(false);
  const [autoApproveLimit, setAutoApproveLimit] = useState('500');

  // Integrations
  const [ga4Id, setGa4Id] = useState('G-7LY7LND9S9');
  const [metaPixelId, setMetaPixelId] = useState('');
  const [clarityId, setClarityId] = useState('');

  // Payment
  const [phonepeEnabled, setPhonepeEnabled] = useState(true);

  // Notifications
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [notifSenderEmail, setNotifSenderEmail] =
    useState('marketing@ruhvi.in');
  const [notifSenderName, setNotifSenderName] = useState('Ruhvi');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeSection === 'banner') {
        await updateStoreSettings({
          banner_enabled: bannerEnabled,
          banner_text: bannerText,
          banner_color: bannerColor,
          banner_link: bannerLink || null,
        });
      } else if (activeSection === 'homepage') {
        await updateHomepageSettings(homepageSettings);
      } else if (activeSection === 'store') {
        await updateStoreIdentitySettings({
          store_name: storeName,
          store_email: storeEmail,
          store_phone: storePhone,
          gst_number: gstNumber,
          store_address: storeAddress,
        });
      } else if (activeSection === 'shipping') {
        await updateShippingSettings({
          free_shipping_threshold: Number(freeShippingThreshold) || 0,
          cod_charge: Number(codCharge) || 0,
          cod_enabled: codEnabled,
          pickup_address: pickupAddress,
        });
      } else if (activeSection === 'loyalty') {
        await updateLoyaltySettings({
          coins_per_rupee: Number(coinsPerRupee) || 0,
          min_redeem: Number(minRedeem) || 0,
          coins_expiry: Number(coinsExpiry) || 0,
        });
      } else if (activeSection === 'returns') {
        await updateReturnsSettings({
          return_window: Number(returnWindow) || 0,
          auto_approve: autoApprove,
          auto_approve_limit: Number(autoApproveLimit) || 0,
        });
      } else if (activeSection === 'integrations') {
        await updateIntegrationSettings({
          ga4_id: ga4Id,
          meta_pixel_id: metaPixelId,
          clarity_id: clarityId,
        });
      } else if (activeSection === 'payment') {
        await updatePaymentSettings({
          phonepe_enabled: phonepeEnabled,
        });
      } else if (activeSection === 'notifications') {
        await updateNotificationSettings({
          email_enabled: emailEnabled,
          whatsapp_enabled: whatsappEnabled,
          sender_email: notifSenderEmail,
          sender_name: notifSenderName,
        });
      } else if (activeSection === 'security') {
        // No editable fields to persist
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings', err);
      alert('Failed to save settings.');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Configure your store behaviour and integrations
          </p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors ${
            saved ? 'bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-500'
          }`}
        >
          {saved ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="flex gap-5">
        {/* Section Nav */}
        <nav className="w-48 flex-shrink-0 space-y-0.5">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-all ${
                activeSection === s.id
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-slate-500 hover:bg-white/5 hover:text-white'
              }`}
            >
              <s.icon className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="flex-1">{s.label}</span>
              {activeSection === s.id && (
                <ChevronRight className="h-3 w-3 opacity-60" />
              )}
            </button>
          ))}
        </nav>

        {/* Content */}
        <form onSubmit={handleSave} className="flex-1 space-y-5">
          {activeSection === 'homepage' && (
            <div className="space-y-5">
              <Section title="Hero Section">
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <Field label="Hero Title">
                      <Input
                        value={homepageSettings.hero_title}
                        onChange={(e) =>
                          setHomepageSettings({
                            ...homepageSettings,
                            hero_title: e.target.value,
                          })
                        }
                        placeholder="Designed to be remembered."
                      />
                    </Field>
                  </div>
                  <div className="col-span-2">
                    <Field label="Hero Image URL">
                      <Input
                        value={homepageSettings.hero_image_url}
                        onChange={(e) =>
                          setHomepageSettings({
                            ...homepageSettings,
                            hero_image_url: e.target.value,
                          })
                        }
                        placeholder="https://images.unsplash.com/photo-..."
                      />
                    </Field>
                  </div>
                  <Field label="CTA 1 Text">
                    <Input
                      value={homepageSettings.hero_cta1_text}
                      onChange={(e) =>
                        setHomepageSettings({
                          ...homepageSettings,
                          hero_cta1_text: e.target.value,
                        })
                      }
                      placeholder="Explore Collection"
                    />
                  </Field>
                  <Field label="CTA 1 Link">
                    <Input
                      value={homepageSettings.hero_cta1_link}
                      onChange={(e) =>
                        setHomepageSettings({
                          ...homepageSettings,
                          hero_cta1_link: e.target.value,
                        })
                      }
                      placeholder="/products"
                    />
                  </Field>
                  <Field label="CTA 2 Text">
                    <Input
                      value={homepageSettings.hero_cta2_text}
                      onChange={(e) =>
                        setHomepageSettings({
                          ...homepageSettings,
                          hero_cta2_text: e.target.value,
                        })
                      }
                      placeholder="Discover New Arrivals"
                    />
                  </Field>
                  <Field label="CTA 2 Link">
                    <Input
                      value={homepageSettings.hero_cta2_link}
                      onChange={(e) =>
                        setHomepageSettings({
                          ...homepageSettings,
                          hero_cta2_link: e.target.value,
                        })
                      }
                      placeholder="/collections/new-arrivals"
                    />
                  </Field>
                </div>
              </Section>

              <Section title="Lifestyle Section">
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <Field label="Lifestyle Image URL">
                      <Input
                        value={homepageSettings.lifestyle_image_url}
                        onChange={(e) =>
                          setHomepageSettings({
                            ...homepageSettings,
                            lifestyle_image_url: e.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>
                  <div className="col-span-2">
                    <Field label="Title">
                      <Input
                        value={homepageSettings.lifestyle_title}
                        onChange={(e) =>
                          setHomepageSettings({
                            ...homepageSettings,
                            lifestyle_title: e.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>
                  <div className="col-span-2">
                    <Field label="Description">
                      <textarea
                        value={homepageSettings.lifestyle_text}
                        onChange={(e) =>
                          setHomepageSettings({
                            ...homepageSettings,
                            lifestyle_text: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </Field>
                  </div>
                  <Field label="CTA Text">
                    <Input
                      value={homepageSettings.lifestyle_cta_text}
                      onChange={(e) =>
                        setHomepageSettings({
                          ...homepageSettings,
                          lifestyle_cta_text: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="CTA Link">
                    <Input
                      value={homepageSettings.lifestyle_cta_link}
                      onChange={(e) =>
                        setHomepageSettings({
                          ...homepageSettings,
                          lifestyle_cta_link: e.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
              </Section>

              <Section title="Why Ruhvi Section">
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <Field label="Title">
                      <Input
                        value={homepageSettings.why_ruhvi_title}
                        onChange={(e) =>
                          setHomepageSettings({
                            ...homepageSettings,
                            why_ruhvi_title: e.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>
                  <div className="col-span-2">
                    <Field label="Description">
                      <textarea
                        value={homepageSettings.why_ruhvi_text}
                        onChange={(e) =>
                          setHomepageSettings({
                            ...homepageSettings,
                            why_ruhvi_text: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </Field>
                  </div>
                  <Field label="CTA Text">
                    <Input
                      value={homepageSettings.why_ruhvi_cta_text}
                      onChange={(e) =>
                        setHomepageSettings({
                          ...homepageSettings,
                          why_ruhvi_cta_text: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="CTA Link">
                    <Input
                      value={homepageSettings.why_ruhvi_cta_link}
                      onChange={(e) =>
                        setHomepageSettings({
                          ...homepageSettings,
                          why_ruhvi_cta_link: e.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
              </Section>
            </div>
          )}

          {activeSection === 'marketing' && (
            <Section title="Quick Send Email">
              <div className="grid grid-cols-1 gap-5">
                <Field
                  label="Recipient Email (To)"
                  hint="The email address to send to."
                >
                  <Input
                    type="email"
                    placeholder="customer@example.com"
                    value={emailForm.to}
                    onChange={(e) =>
                      setEmailForm({ ...emailForm, to: e.target.value })
                    }
                  />
                </Field>
                <Field label="Subject">
                  <Input
                    placeholder="Welcome to Ruhvi!"
                    value={emailForm.subject}
                    onChange={(e) =>
                      setEmailForm({ ...emailForm, subject: e.target.value })
                    }
                  />
                </Field>
                <Field label="HTML Content">
                  <textarea
                    value={emailForm.htmlContent}
                    onChange={(e) =>
                      setEmailForm({
                        ...emailForm,
                        htmlContent: e.target.value,
                      })
                    }
                    rows={6}
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="<h1>Hello</h1>..."
                  />
                </Field>
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={
                      isSending ||
                      !emailForm.to ||
                      !emailForm.subject ||
                      !emailForm.htmlContent
                    }
                    onClick={async () => {
                      setIsSending(true);
                      try {
                        await quickSendEmail(
                          emailForm.to,
                          emailForm.subject,
                          emailForm.htmlContent
                        );
                        alert('Email sent successfully!');
                        setEmailForm({ to: '', subject: '', htmlContent: '' });
                      } catch (err: any) {
                        alert(err.message || 'Failed to send email.');
                      } finally {
                        setIsSending(false);
                      }
                    }}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {isSending ? 'Sending...' : 'Send Email'}
                  </button>
                </div>
              </div>
            </Section>
          )}

          {activeSection === 'banner' && (
            <Section title="Announcement Banner">
              <div className="grid grid-cols-1 gap-5">
                <Toggle
                  label="Enable Top Banner"
                  checked={bannerEnabled}
                  onChange={setBannerEnabled}
                  hint="Show an announcement bar at the top of the website."
                />

                {bannerEnabled && (
                  <>
                    <Field label="Banner Text">
                      <Input
                        value={bannerText}
                        onChange={(e) => setBannerText(e.target.value)}
                        placeholder="e.g. Free shipping on orders over ₹5000"
                      />
                    </Field>
                    <Field
                      label="Banner Link (Optional)"
                      hint="URL to redirect users when they click the banner. Leave empty for no link."
                    >
                      <Input
                        value={bannerLink}
                        onChange={(e) => setBannerLink(e.target.value)}
                        placeholder="e.g. /collections/sale"
                      />
                    </Field>
                    <Field label="Banner Color Scheme">
                      <select
                        value={bannerColor}
                        onChange={(e) => setBannerColor(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option
                          value="bg-gradient-to-r from-fuchsia-600 to-purple-600"
                          className="bg-slate-900"
                        >
                          Fuchsia/Purple (Default)
                        </option>
                        <option
                          value="bg-gradient-to-r from-emerald-600 to-teal-600"
                          className="bg-slate-900"
                        >
                          Emerald/Teal
                        </option>
                        <option
                          value="bg-gradient-to-r from-orange-500 to-rose-500"
                          className="bg-slate-900"
                        >
                          Orange/Rose (Sale)
                        </option>
                        <option value="bg-slate-900" className="bg-slate-900">
                          Dark Solid
                        </option>
                      </select>
                    </Field>

                    <div className="border-t border-white/10 pt-4">
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Live Preview
                      </p>
                      <div
                        className={`w-full ${bannerColor} rounded-lg px-4 py-2 text-center text-xs font-medium tracking-wide text-white`}
                      >
                        {bannerText || 'Your banner text here'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Section>
          )}

          {activeSection === 'store' && (
            <Section title="Store Information">
              <div className="grid grid-cols-2 gap-5">
                <Field label="Store Name">
                  <Input
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                  />
                </Field>
                <Field label="Support Email">
                  <Input
                    type="email"
                    value={storeEmail}
                    onChange={(e) => setStoreEmail(e.target.value)}
                  />
                </Field>
                <Field label="Support Phone">
                  <Input
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                  />
                </Field>
                <Field label="GST Number">
                  <Input
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    placeholder="27XXXXX1234A1ZX"
                  />
                </Field>
                <div className="col-span-2">
                  <Field
                    label="Store Address"
                    hint="Used on invoices and shipping labels"
                  >
                    <textarea
                      value={storeAddress}
                      onChange={(e) => setStoreAddress(e.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="Full store address including PIN code"
                    />
                  </Field>
                </div>
              </div>
            </Section>
          )}

          {activeSection === 'shipping' && (
            <Section title="Shipping Settings">
              <div className="grid grid-cols-2 gap-5">
                <Field
                  label="Free Shipping Threshold (₹)"
                  hint="Orders above this get free shipping"
                >
                  <Input
                    type="number"
                    value={freeShippingThreshold}
                    onChange={(e) => setFreeShippingThreshold(e.target.value)}
                  />
                </Field>
                <Field label="COD Handling Charge (₹)">
                  <Input
                    type="number"
                    value={codCharge}
                    onChange={(e) => setCodCharge(e.target.value)}
                  />
                </Field>
                <div className="col-span-2">
                  <Toggle
                    label="Cash on Delivery (COD)"
                    checked={codEnabled}
                    onChange={setCodEnabled}
                    hint="Allow customers to pay cash at delivery"
                  />
                </div>
                <div className="col-span-2">
                  <Field
                    label="Default Pickup Address"
                    hint="Your warehouse or packaging address for Shiprocket"
                  >
                    <textarea
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="Pickup address for Shiprocket"
                    />
                  </Field>
                </div>
              </div>
            </Section>
          )}

          {activeSection === 'loyalty' && (
            <Section title="Loyalty & Rewards Configuration">
              <div className="grid grid-cols-2 gap-5">
                <Field
                  label="Coins Earned per ₹ Spent"
                  hint="e.g. 1 coin per ₹10 spent = 0.1"
                >
                  <Input
                    type="number"
                    step="0.01"
                    value={coinsPerRupee}
                    onChange={(e) => setCoinsPerRupee(e.target.value)}
                  />
                </Field>
                <Field label="Minimum Coins to Redeem">
                  <Input
                    type="number"
                    value={minRedeem}
                    onChange={(e) => setMinRedeem(e.target.value)}
                  />
                </Field>
                <Field label="Coins Expiry (months)">
                  <Input
                    type="number"
                    value={coinsExpiry}
                    onChange={(e) => setCoinsExpiry(e.target.value)}
                  />
                </Field>
              </div>
            </Section>
          )}

          {activeSection === 'returns' && (
            <Section title="Return & Refund Policy">
              <div className="grid grid-cols-2 gap-5">
                <Field
                  label="Return Window (days)"
                  hint="Number of days after delivery to accept returns"
                >
                  <Input
                    type="number"
                    value={returnWindow}
                    onChange={(e) => setReturnWindow(e.target.value)}
                  />
                </Field>
                <Field
                  label="Auto-approve Threshold (₹)"
                  hint="Refunds below this amount are auto-approved"
                >
                  <Input
                    type="number"
                    value={autoApproveLimit}
                    onChange={(e) => setAutoApproveLimit(e.target.value)}
                  />
                </Field>
                <div className="col-span-2">
                  <Toggle
                    label="Auto-approve Small Refunds"
                    checked={autoApprove}
                    onChange={setAutoApprove}
                    hint={`Automatically approve refunds below ₹${autoApproveLimit}`}
                  />
                </div>
              </div>
            </Section>
          )}

          {activeSection === 'integrations' && (
            <Section title="Third-Party Integrations">
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <Field
                    label="Google Analytics 4 ID"
                    hint="Measurement ID starting with G-"
                  >
                    <Input
                      value={ga4Id}
                      onChange={(e) => setGa4Id(e.target.value)}
                      placeholder="G-XXXXXXXXXX"
                    />
                  </Field>
                  <Field label="Meta Pixel ID">
                    <Input
                      value={metaPixelId}
                      onChange={(e) => setMetaPixelId(e.target.value)}
                      placeholder="1234567890"
                    />
                  </Field>
                  <Field label="Microsoft Clarity ID">
                    <Input
                      value={clarityId}
                      onChange={(e) => setClarityId(e.target.value)}
                      placeholder="xxxxxxxxxx"
                    />
                  </Field>
                </div>
                <div className="space-y-3 border-t border-white/5 pt-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Pending Setup
                  </p>
                  {[
                    {
                      label: 'PhonePe Payment Gateway',
                      status: 'Account setup pending — documentation required',
                    },
                    {
                      label: 'WhatsApp Business API',
                      status: 'Business account setup pending',
                    },
                    {
                      label: 'Shiprocket API',
                      status: 'API keys required — partially implemented',
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-xl border border-amber-500/10 bg-amber-500/5 p-3"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-200">
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-[10px] text-amber-400/70">
                          {item.status}
                        </p>
                      </div>
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-400">
                        PENDING
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {activeSection === 'security' && (
            <Section title="Security Settings">
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4">
                  <p className="text-xs font-semibold text-emerald-400">
                    Admin Access Restricted
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    The admin panel is only accessible via{' '}
                    <strong className="text-slate-300">admin.ruhvi.in</strong>.
                    Customer-facing site at ruhvi.vercel.app does not expose any
                    admin routes.
                  </p>
                </div>
                <div className="bg-white/3 space-y-3 rounded-xl border border-white/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Cloudflare Turnstile
                  </p>
                  <Field label="Site Key">
                    <Input
                      placeholder="••••••••••••"
                      type="password"
                      readOnly
                    />
                  </Field>
                </div>
              </div>
            </Section>
          )}

          {activeSection === 'payment' && (
            <Section title="Payment Settings">
              <div className="grid grid-cols-1 gap-5">
                <Toggle
                  label="PhonePe Online Payments"
                  checked={phonepeEnabled}
                  onChange={setPhonepeEnabled}
                  hint="Accept UPI, cards and netbanking at checkout via PhonePe."
                />
                <div className="bg-white/3 rounded-xl border border-white/5 p-4 text-[11px] text-slate-500">
                  COD availability is controlled under Shipping Settings.
                  PhonePe credentials are configured via environment variables
                  (PHONEPE_MERCHANT_ID, PHONEPE_SALT_KEY).
                </div>
              </div>
            </Section>
          )}

          {activeSection === 'notifications' && (
            <Section title="Notification Settings">
              <div className="grid grid-cols-1 gap-5">
                <Toggle
                  label="Email Notifications"
                  checked={emailEnabled}
                  onChange={setEmailEnabled}
                  hint="Send transactional emails such as order confirmations and shipping updates."
                />
                <Toggle
                  label="WhatsApp Notifications"
                  checked={whatsappEnabled}
                  onChange={setWhatsappEnabled}
                  hint="Send order updates via WhatsApp once the Business API integration is active."
                />
                <div className="grid grid-cols-2 gap-5">
                  <Field label="Sender Email">
                    <Input
                      type="email"
                      value={notifSenderEmail}
                      onChange={(e) => setNotifSenderEmail(e.target.value)}
                      placeholder="marketing@ruhvi.in"
                    />
                  </Field>
                  <Field label="Sender Name">
                    <Input
                      value={notifSenderName}
                      onChange={(e) => setNotifSenderName(e.target.value)}
                      placeholder="Ruhvi"
                    />
                  </Field>
                </div>
              </div>
            </Section>
          )}
        </form>
      </div>
    </div>
  );
}
