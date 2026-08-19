'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Sun,
  Moon,
  Laptop,
  Globe,
  Bell,
  MessageSquare,
  Shield,
  MapPin,
  CreditCard,
  FileText,
  Info,
  Trash2,
  Lock,
  Smartphone,
  Check,
  ChevronRight,
  AlertTriangle,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { SpatialPage } from '@/components/design-system/SpatialPage';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

const T = {
  en: {
    breadcrumbsAccount: 'Account',
    breadcrumbsSettings: 'Settings',
    title: 'Settings & Preferences',
    subtitle:
      'Manage your appearance, notifications, privacy, saved addresses, and security settings.',
    appearanceTitle: 'Appearance',
    appearanceSubtitle: 'Customize how Ruhvi looks on your current device.',
    systemDefault: 'System Default',
    systemDesc: 'Matches OS theme',
    warmIvory: 'Warm Ivory (Light)',
    warmIvoryDesc: 'Polished cream surfaces',
    nightVelvet: 'Night Velvet (Dark)',
    nightVelvetDesc: 'Muted charcoal tones',
    languageTitle: 'Language',
    languageSubtitle:
      'Select your preferred language for navigation and notifications.',
    english: 'English (India)',
    englishDesc: 'Default',
    bengali: 'বাংলা (Bengali)',
    bengaliDesc: 'Regional edition',
    hindi: 'हिन्दी (Hindi)',
    hindiDesc: 'Regional edition',
    notifTitle: 'Notification Preferences',
    notifSubtitle: 'Choose the updates and communication you wish to receive.',
    commChannels: 'Communication Channels',
    email: 'Email',
    whatsapp: 'WhatsApp',
    pushNotifs: 'Push Notifications',
    orderUpdates: 'Order Updates (Transactional)',
    orderConfirmation: 'Order Confirmation & Receipt',
    dispatchedTracking: 'Dispatched & Tracking Updates',
    outForDelivery: 'Out for Delivery & Delivery Confirmation',
    returnRefund: 'Return & Refund Processing Updates',
    promotionsOffers: 'Promotions & Exclusive Offers',
    specialOffers: 'Special Festival & VIP Member Offers',
    newLaunches: 'New Jewellery Collection Launches',
    limitedGold: 'Limited Time Gold Plated Deals',
    privacyTitle: 'Privacy & Security',
    privacySubtitle:
      'Manage your credentials, login activity, and account protection.',
    password: 'Password',
    passwordDesc: 'Change your account password securely.',
    changePassword: 'Change Password',
    activeDevices: 'Active Devices & Sessions',
    currentSession: 'Current',
    signOut: 'Sign Out',
    deleteAccount: 'Delete Account',
    deleteAccountDesc:
      'Permanently remove your profile, order history, and wallet records.',
    savedAddresses: 'Saved Addresses',
    savedAddressesDesc: 'Manage Home, Work & Delivery locations',
    savedPayment: 'Saved Payment Methods',
    savedPaymentDesc: 'Masked Cards (Visa •••• 4821) & UPI',
    tokenized: 'Tokenized',
    legalTitle: 'Legal & Brand Policies',
    legalSubtitle:
      'Review our terms of service, returns policy, and jewellery warranty.',
    terms: 'Terms & Conditions',
    privacyPolicy: 'Privacy Policy',
    returnPolicy: 'Return Policy',
    shippingPolicy: 'Shipping Policy',
    dataDeletion: 'Data Deletion Policy',
    version: 'Version',
    rightsReserved: 'All rights reserved.',
    cancel: 'Cancel',
    updatePassword: 'Update Password',
    newPasswordLabel: 'New Password',
    confirmPasswordLabel: 'Confirm New Password',
    minCharacters: 'Minimum 6 characters',
    repeatPassword: 'Repeat new password',
    updating: 'Updating...',
    deleting: 'Deleting...',
    confirmDeletion: 'Confirm Deletion',
    deleteWarning:
      'Are you sure you want to delete your Ruhvi account? This action is irreversible. All saved orders, addresses, and store credits will be permanently lost.',
  },
  bn: {
    breadcrumbsAccount: 'অ্যাকাউন্ট',
    breadcrumbsSettings: 'সেটিংস',
    title: 'সেটিংস ও পছন্দসমূহ',
    subtitle:
      'আপনার থিম (অ্যাপিয়ারেন্স), নোটিফিকেশন, প্রাইভেসী, সেভ করা ঠিকানা এবং সিকিউরিটি সেটিংস পরিচালনা করুন।',
    appearanceTitle: 'থিম (অ্যাপিয়ারেন্স)',
    appearanceSubtitle: 'আপনার ডিভাইসে রুহভি দেখতে কেমন হবে তা কাস্টমাইজ করুন।',
    systemDefault: 'সিস্টেম ডিফল্ট',
    systemDesc: 'ডিভাইস থিমের সাথে মিলবে',
    warmIvory: 'ওয়ার্ম আইভরি (লাইট)',
    warmIvoryDesc: 'উজ্জ্বল ক্রিম টেক্সচার',
    nightVelvet: 'নাইট ভেলভেট (ডার্ক)',
    nightVelvetDesc: 'শান্ত চারকোল টোন',
    languageTitle: 'ভাষা (Language)',
    languageSubtitle: 'আপনার সুবিধাজনক ভাষাটি নির্বাচন করুন।',
    english: 'English (India)',
    englishDesc: 'Default',
    bengali: 'বাংলা (Bengali)',
    bengaliDesc: 'আঞ্চলিক সংস্করণ',
    hindi: 'हिन्दी (Hindi)',
    hindiDesc: 'আঞ্চলিক সংস্করণ',
    notifTitle: 'নোটিফিকেশন সেটিংস',
    notifSubtitle:
      'আপনি কী ধরণের আপডেট ও নোটিফিকেশন পেতে চান তা নির্বাচন করুন।',
    commChannels: 'যোগাযোগের মাধ্যম',
    email: 'ইমেইল',
    whatsapp: 'হোয়াটসঅ্যাপ',
    pushNotifs: 'পুশ নোটিফিকেশন',
    orderUpdates: 'অর্ডারের আপডেটসমূহ',
    orderConfirmation: 'অর্ডার নিশ্চিতকরণ এবং রসিদ',
    dispatchedTracking: 'অর্ডার পাঠানো এবং ট্র্যাকিং আপডেট',
    outForDelivery: 'ডেলিভারি এবং ডেলিভারি কনফার্মেশন',
    returnRefund: 'রিটার্ন এবং রিফান্ড প্রসেসিং আপডেট',
    promotionsOffers: 'অফার ও বিজ্ঞাপনসমূহ',
    specialOffers: 'বিশেষ উৎসব এবং ভিআইপি মেম্বার অফার',
    newLaunches: 'নতুন জুয়েলারি কালেকশন লঞ্চের আপডেট',
    limitedGold: 'সীমিত সময়ের জন্য গোল্ড প্লেটেড ডিল',
    privacyTitle: 'প্রাইভেসী ও সিকিউরিটি',
    privacySubtitle:
      'আপনার পাসওয়ার্ড, ডিভাইস সেশন এবং অ্যাকাউন্ট সুরক্ষা সেটিংস পরিচালনা করুন।',
    password: 'পাসওয়ার্ড',
    passwordDesc: 'নিরাপদে আপনার অ্যাকাউন্ট পাসওয়ার্ড পরিবর্তন করুন।',
    changePassword: 'পাসওয়ার্ড পরিবর্তন',
    activeDevices: 'সক্রিয় ডিভাইস এবং সেশনসমূহ',
    currentSession: 'বর্তমান',
    signOut: 'লগ আউট',
    deleteAccount: 'অ্যাকাউন্ট মুছুন',
    deleteAccountDesc:
      'স্থায়ীভাবে আপনার প্রোফাইল, অর্ডার হিস্ট্রি এবং ওয়ালেট রেকর্ড মুছে দিন।',
    savedAddresses: 'সংরক্ষিত ঠিকানা',
    savedAddressesDesc: 'হোম, অফিস ও ডেলিভারি ঠিকানা পরিচালনা করুন',
    savedPayment: 'সংরক্ষিত পেমেন্ট পদ্ধতি',
    savedPaymentDesc: 'কার্ড (Visa •••• 4821) এবং ইউপিআই',
    tokenized: 'টোকেনাইজড',
    legalTitle: 'আইনি ও ব্র্যান্ড পলিসি',
    legalSubtitle:
      'আমাদের পরিষেবার শর্তাবলী, রিটার্ন পলিসি এবং জুয়েলারি ওয়ারেন্টি দেখুন।',
    terms: 'শর্তাবলী ও নিয়মাবলী',
    privacyPolicy: 'গোপনীয়তা নীতি',
    returnPolicy: 'রিটার্ন পলিসি',
    shippingPolicy: 'শিপিং পলিসি',
    dataDeletion: 'ডেটা মুছে ফেলার নীতি',
    version: 'ভার্সন',
    rightsReserved: 'সর্বস্বত্ব সংরক্ষিত।',
    cancel: 'বাতিল',
    updatePassword: 'পাসওয়ার্ড আপডেট',
    newPasswordLabel: 'নতুন পাসওয়ার্ড',
    confirmPasswordLabel: 'নতুন পাসওয়ার্ড নিশ্চিত করুন',
    minCharacters: 'কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড',
    repeatPassword: 'নতুন পাসওয়ার্ড পুনরায় লিখুন',
    updating: 'আপডেট হচ্ছে...',
    deleting: 'মুছে ফেলা হচ্ছে...',
    confirmDeletion: 'মুছে ফেলার নিশ্চিতকরণ',
    deleteWarning:
      'আপনি কি নিশ্চিত যে আপনি আপনার রুহভি অ্যাকাউন্ট মুছে ফেলতে চান? এটি আর ফেরত আনা যাবে না। আপনার সমস্ত সংরক্ষিত অর্ডার, ঠিকানা এবং স্টোর ক্রেডিট স্থায়ীভাবে মুছে যাবে।',
  },
  hi: {
    breadcrumbsAccount: 'खाता',
    breadcrumbsSettings: 'सेटिंग्स',
    title: 'सेटिंग्स और प्राथमिकताएं',
    subtitle:
      'अपनी उपस्थिति (थीम), नोटिफिकेशन, गोपनीयता, सहेजे गए पते और सुरक्षा सेटिंग्स प्रबंधित करें।',
    appearanceTitle: 'उपस्थिति (थीम)',
    appearanceSubtitle: 'अपने डिवाइस पर रूहवी के स्वरूप को अनुकूलित करें।',
    systemDefault: 'सिस्टम डिफ़ॉल्ट',
    systemDesc: 'डिवाइस थीम के साथ मेल खाता है',
    warmIvory: 'वार्म आइवरी (लाइट)',
    warmIvoryDesc: 'चमकदार क्रीम सतह',
    nightVelvet: 'नाइट वेलवेट (डार्क)',
    nightVelvetDesc: 'शांत चारकोल टोन',
    languageTitle: 'भाषा (Language)',
    languageSubtitle: 'नेविगेशन और नोटिफिकेशन के लिए अपनी पसंदीदा भाषा चुनें।',
    english: 'English (India)',
    englishDesc: 'Default',
    bengali: 'বাংলা (Bengali)',
    bengaliDesc: 'क्षेत्रीय संस्करण',
    hindi: 'हिन्दी (Hindi)',
    hindiDesc: 'क्षेत्रीय संस्करण',
    notifTitle: 'नोटिफिकेशन प्राथमिकताएं',
    notifSubtitle: 'चुनें कि आप कौन से अपडेट और संदेश प्राप्त करना चाहते हैं।',
    commChannels: 'संचार के माध्यम',
    email: 'ईमेल',
    whatsapp: 'व्हाट्सएप',
    pushNotifs: 'पुश नोटिफिकेशन',
    orderUpdates: 'ऑर्डर अपडेट (लेन-देने)',
    orderConfirmation: 'ऑर्डर की पुष्टि और रसीद',
    dispatchedTracking: 'शिपिंग और ट्रैकिंग अपडेट',
    outForDelivery: 'डिलिवरी और डिलिटरी की पुष्टि',
    returnRefund: 'रिटर्न और रिफंड प्रोसेसिंग अपडेट',
    promotionsOffers: 'प्रचार और विशेष ऑफर',
    specialOffers: 'विशेष त्योहार और वीआईपी सदस्य ऑफर',
    newLaunches: 'नए आभूषण संग्रह की लॉन्चिंग',
    limitedGold: 'सीमित समय के लिए गोल्ड प्लेटेड डील्स',
    privacyTitle: 'गोपनीयता और सुरक्षा',
    privacySubtitle: 'अपनी साख, लॉगिन गतिविधि और खाता सुरक्षा प्रबंधित करें।',
    password: 'पासवर्ड',
    passwordDesc: 'सुरक्षित रूप से अपना खाता पासवर्ड बदलें।',
    changePassword: 'पासवर्ड बदलें',
    activeDevices: 'सक्रिय डिवाइस और सत्र',
    currentSession: 'वर्तमान',
    signOut: 'साइन आउट',
    deleteAccount: 'खाता हटाएं',
    deleteAccountDesc:
      'स्थायी रूप से अपनी प्रोफ़ाइल, ऑर्डर इतिहास और वॉलेट रिकॉर्ड हटा दें।',
    savedAddresses: 'सहेजे गए पते',
    savedAddressesDesc: 'घर, कार्यालय और वितरण स्थान प्रबंधित करें',
    savedPayment: 'सहेजे गए भुगतान विकल्प',
    savedPaymentDesc: 'सहेजे गए कार्ड (Visa •••• 4821) और यूपीआई',
    tokenized: 'टोकनयुक्त',
    legalTitle: 'कानूनी और ब्रांड नीतियां',
    legalSubtitle: 'हमारी सेवा की शर्तें, वापसी नीति और आभूषण वारंटी देखें।',
    terms: 'नियम और शर्तें',
    privacyPolicy: 'गोपनीयता नीति',
    returnPolicy: 'वापसी नीति',
    shippingPolicy: 'शिपिंग नीति',
    dataDeletion: 'डेटा हटाने की नीति',
    version: 'संस्करण',
    rightsReserved: 'सर्वाधिकार सुरक्षित।',
    cancel: 'रद्द करें',
    updatePassword: 'पासवर्ड अपडेट करें',
    newPasswordLabel: 'नया पासवर्ड',
    confirmPasswordLabel: 'नए पासवर्ड की पुष्टि करें',
    minCharacters: 'कम से कम 6 अक्षर',
    repeatPassword: 'नया पासवर्ड फिर से लिखें',
    updating: 'अपडेट हो रहा है...',
    deleting: 'हटाया जा रहा है...',
    confirmDeletion: 'हटाने की पुष्टि करें',
    deleteWarning:
      'क्या आप वाकई अपना रूहवी खाता हटाना चाहते हैं? यह क्रिया अपरिवर्तनीय है। आपके सभी सहेजे गए ऑर्डर, पते और स्टोर क्रेडिट स्थायी रूप से नष्ट हो जाएंगे।',
  },
};

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  // 1. Appearance State
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');

  // 2. Language State
  const [language, setLanguage] = useState<'en' | 'bn' | 'hi'>('en');

  // 3. Notification Preferences State
  const [orderNotifs, setOrderNotifs] = useState({
    confirmation: true,
    shipping: true,
    delivery: true,
    cancellation: true,
    refunds: true,
  });

  const [marketingNotifs, setMarketingNotifs] = useState({
    offers: true,
    discounts: true,
    newCollections: true,
    flashSales: false,
    recommendations: true,
  });

  const [channels, setChannels] = useState({
    email: true,
    whatsapp: true,
    push: false,
  });

  // Modals State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Active sessions mock for luxury feel
  const [activeSessions] = useState([
    {
      id: 'session-1',
      device: 'Chrome on Windows 11 (Current)',
      ip: '103.212.**.**',
      location: 'Kolkata, India',
      isCurrent: true,
      lastActive: 'Just now',
    },
    {
      id: 'session-2',
      device: 'Safari on iPhone 15 Pro',
      ip: '103.212.**.**',
      location: 'Kolkata, India',
      isCurrent: false,
      lastActive: '2 days ago',
    },
  ]);

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme =
        (localStorage.getItem('theme') as 'system' | 'light' | 'dark') ||
        'system';
      setTheme(savedTheme);

      const savedLang =
        (localStorage.getItem('language') as 'en' | 'bn' | 'hi') || 'en';
      setLanguage(savedLang);

      const savedChannels = localStorage.getItem('settings_channels');
      if (savedChannels) setChannels(JSON.parse(savedChannels));

      const savedOrderNotifs = localStorage.getItem('settings_order_notifs');
      if (savedOrderNotifs) setOrderNotifs(JSON.parse(savedOrderNotifs));

      const savedMarketingNotifs = localStorage.getItem(
        'settings_marketing_notifs'
      );
      if (savedMarketingNotifs)
        setMarketingNotifs(JSON.parse(savedMarketingNotifs));
    }
  }, []);

  const handleThemeChange = (newTheme: 'system' | 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    const root = document.documentElement;
    root.classList.remove('dark', 'light');

    let activeTheme = newTheme;
    if (newTheme === 'system') {
      const systemPrefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      activeTheme = systemPrefersDark ? 'dark' : 'light';
    }

    if (activeTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.add('light');
    }

    const toastMsg =
      newTheme === 'system'
        ? 'Theme updated to System Default'
        : newTheme === 'light'
          ? 'Theme updated to Warm Ivory (Light)'
          : 'Theme updated to Night Velvet (Dark)';
    toast.success(toastMsg);
  };

  const handleLanguageChange = (newLang: 'en' | 'bn' | 'hi') => {
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
    const msg =
      newLang === 'en'
        ? 'Language set to English'
        : newLang === 'bn'
          ? 'ভাষা পরিবর্তন করা হয়েছে (বাংলা)'
          : 'भाषा बदल दी गई है (हिंदी)';
    toast.success(msg);
  };

  const handleChannelChange = (
    channelKey: 'email' | 'whatsapp' | 'push',
    value: boolean
  ) => {
    const updated = { ...channels, [channelKey]: value };
    setChannels(updated);
    localStorage.setItem('settings_channels', JSON.stringify(updated));
    toast.success('Channel preferences updated');
  };

  const handleOrderNotifChange = (notifKey: string, value: boolean) => {
    const updated = { ...orderNotifs, [notifKey]: value };
    setOrderNotifs(updated as any);
    localStorage.setItem('settings_order_notifs', JSON.stringify(updated));
    toast.success('Notification preferences updated');
  };

  const handleMarketingNotifChange = (notifKey: string, value: boolean) => {
    const updated = { ...marketingNotifs, [notifKey]: value };
    setMarketingNotifs(updated as any);
    localStorage.setItem('settings_marketing_notifs', JSON.stringify(updated));
    toast.success('Marketing preferences updated');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setChangingPass(true);
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      toast.success('Password updated successfully');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update password');
    } finally {
      setChangingPass(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeletingAccount(true);
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { error } = await supabase.rpc('delete_user_account');
      if (error) {
        // Fallback: delete profiles row
        const { error: profileErr } = await supabase
          .from('profiles')
          .delete()
          .eq('id', user?.id);
        if (profileErr) throw profileErr;
      }
      await signOut();
      toast.success('Your account has been deleted');
      router.push('/');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete account');
    } finally {
      setDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  const t = T[language];

  return (
    <SpatialPage className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8 pb-16">
        {/* Header and Breadcrumbs */}
        <div>
          <div className="mb-3 flex items-center space-x-2 text-sm font-medium text-stone-500 dark:text-stone-400">
            <Link
              href="/account"
              className="transition hover:text-gold-600 dark:hover:text-gold-400"
            >
              {t.breadcrumbsAccount}
            </Link>
            <span>/</span>
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {t.breadcrumbsSettings}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gold-600 dark:text-gold-400">
                Account Preferences
              </p>
              <h1 className="mt-1.5 font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl dark:text-white">
                {t.title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-stone-600 sm:text-base dark:text-stone-300">
                {t.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Appearance */}
        <section className="rounded-2xl border border-gold-200/60 bg-[#FCFBF7] p-6 shadow-sm sm:p-7 dark:border-gold-500/20 dark:bg-[#1c1a19]">
          <div className="flex items-center space-x-3.5 border-b border-stone-200/60 pb-4 dark:border-stone-800">
            <div className="rounded-xl bg-gold-100/80 p-2.5 text-gold-800 dark:bg-gold-950/60 dark:text-gold-300">
              <Sun className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900 sm:text-xl dark:text-white">
                {t.appearanceTitle}
              </h2>
              <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-300">
                {t.appearanceSubtitle}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* System */}
            <button
              type="button"
              onClick={() => handleThemeChange('system')}
              className={`flex flex-col items-center justify-between rounded-xl border p-5 text-center transition-all ${
                theme === 'system'
                  ? 'shadow-xs border-gold-500 bg-gold-50/60 ring-2 ring-gold-400/40 dark:border-gold-400 dark:bg-gold-950/30'
                  : 'border-stone-200 bg-white hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700'
              }`}
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200">
                <Laptop className="h-6 w-6" />
              </div>
              <span className="font-serif text-sm font-bold text-stone-900 sm:text-base dark:text-white">
                {t.systemDefault}
              </span>
              <span className="mt-1 text-xs font-medium text-stone-500 dark:text-stone-300">
                {t.systemDesc}
              </span>
              {theme === 'system' ? (
                <span className="mt-3 inline-flex items-center text-xs font-bold text-gold-700 dark:text-gold-400">
                  <Check className="mr-1 h-3.5 w-3.5" /> Active
                </span>
              ) : (
                <span className="mt-3 text-xs opacity-0">Inactive</span>
              )}
            </button>

            {/* Light */}
            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              className={`flex flex-col items-center justify-between rounded-xl border p-5 text-center transition-all ${
                theme === 'light'
                  ? 'shadow-xs border-gold-500 bg-gold-50/60 ring-2 ring-gold-400/40 dark:border-gold-400 dark:bg-gold-950/30'
                  : 'border-stone-200 bg-white hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700'
              }`}
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                <Sun className="h-6 w-6" />
              </div>
              <span className="font-serif text-sm font-bold text-stone-900 sm:text-base dark:text-white">
                {t.warmIvory}
              </span>
              <span className="mt-1 text-xs font-medium text-stone-500 dark:text-stone-300">
                {t.warmIvoryDesc}
              </span>
              {theme === 'light' ? (
                <span className="mt-3 inline-flex items-center text-xs font-bold text-gold-700 dark:text-gold-400">
                  <Check className="mr-1 h-3.5 w-3.5" /> Active
                </span>
              ) : (
                <span className="mt-3 text-xs opacity-0">Inactive</span>
              )}
            </button>

            {/* Dark */}
            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              className={`flex flex-col items-center justify-between rounded-xl border p-5 text-center transition-all ${
                theme === 'dark'
                  ? 'shadow-xs border-gold-500 bg-gold-50/60 ring-2 ring-gold-400/40 dark:border-gold-400 dark:bg-gold-950/30'
                  : 'border-stone-200 bg-white hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700'
              }`}
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stone-800 text-gold-400 dark:bg-stone-800 dark:text-gold-300">
                <Moon className="h-6 w-6" />
              </div>
              <span className="font-serif text-sm font-bold text-stone-900 sm:text-base dark:text-white">
                {t.nightVelvet}
              </span>
              <span className="mt-1 text-xs font-medium text-stone-500 dark:text-stone-300">
                {t.nightVelvetDesc}
              </span>
              {theme === 'dark' ? (
                <span className="mt-3 inline-flex items-center text-xs font-bold text-gold-700 dark:text-gold-400">
                  <Check className="mr-1 h-3.5 w-3.5" /> Active
                </span>
              ) : (
                <span className="mt-3 text-xs opacity-0">Inactive</span>
              )}
            </button>
          </div>
        </section>

        {/* Section 2: Language */}
        <section className="rounded-2xl border border-gold-200/60 bg-[#FCFBF7] p-6 shadow-sm sm:p-7 dark:border-gold-500/20 dark:bg-[#1c1a19]">
          <div className="flex items-center space-x-3.5 border-b border-stone-200/60 pb-4 dark:border-stone-800">
            <div className="rounded-xl bg-gold-100/80 p-2.5 text-gold-800 dark:bg-gold-950/60 dark:text-gold-300">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900 sm:text-xl dark:text-white">
                {t.languageTitle}
              </h2>
              <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-300">
                {t.languageSubtitle}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* English */}
            <button
              type="button"
              onClick={() => handleLanguageChange('en')}
              className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                language === 'en'
                  ? 'shadow-xs border-gold-500 bg-gold-50/60 ring-2 ring-gold-400/40 dark:border-gold-400 dark:bg-gold-950/30'
                  : 'border-stone-200 bg-white hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700'
              }`}
            >
              <div>
                <p className="font-serif text-sm font-bold text-stone-900 sm:text-base dark:text-white">
                  {t.english}
                </p>
                <p className="mt-0.5 text-xs font-medium text-stone-500 dark:text-stone-300">
                  {t.englishDesc}
                </p>
              </div>
              {language === 'en' && (
                <Check className="h-5 w-5 font-bold text-gold-600 dark:text-gold-400" />
              )}
            </button>

            {/* Bengali */}
            <button
              type="button"
              onClick={() => handleLanguageChange('bn')}
              className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                language === 'bn'
                  ? 'shadow-xs border-gold-500 bg-gold-50/60 ring-2 ring-gold-400/40 dark:border-gold-400 dark:bg-gold-950/30'
                  : 'border-stone-200 bg-white hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700'
              }`}
            >
              <div>
                <p className="font-serif text-sm font-bold text-stone-900 sm:text-base dark:text-white">
                  {t.bengali}
                </p>
                <p className="mt-0.5 text-xs font-medium text-stone-500 dark:text-stone-300">
                  {t.bengaliDesc}
                </p>
              </div>
              {language === 'bn' && (
                <Check className="h-5 w-5 font-bold text-gold-600 dark:text-gold-400" />
              )}
            </button>

            {/* Hindi */}
            <button
              type="button"
              onClick={() => handleLanguageChange('hi')}
              className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                language === 'hi'
                  ? 'shadow-xs border-gold-500 bg-gold-50/60 ring-2 ring-gold-400/40 dark:border-gold-400 dark:bg-gold-950/30'
                  : 'border-stone-200 bg-white hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700'
              }`}
            >
              <div>
                <p className="font-serif text-sm font-bold text-stone-900 sm:text-base dark:text-white">
                  {t.hindi}
                </p>
                <p className="mt-0.5 text-xs font-medium text-stone-500 dark:text-stone-300">
                  {t.hindiDesc}
                </p>
              </div>
              {language === 'hi' && (
                <Check className="h-5 w-5 font-bold text-gold-600 dark:text-gold-400" />
              )}
            </button>
          </div>
        </section>

        {/* Section 3: Notification Preferences */}
        <section className="rounded-2xl border border-gold-200/60 bg-[#FCFBF7] p-6 shadow-sm sm:p-7 dark:border-gold-500/20 dark:bg-[#1c1a19]">
          <div className="flex items-center space-x-3.5 border-b border-stone-200/60 pb-4 dark:border-stone-800">
            <div className="rounded-xl bg-gold-100/80 p-2.5 text-gold-800 dark:bg-gold-950/60 dark:text-gold-300">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900 sm:text-xl dark:text-white">
                {t.notifTitle}
              </h2>
              <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-300">
                {t.notifSubtitle}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            {/* Delivery Channels */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                {t.commChannels}
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="shadow-xs flex cursor-pointer items-center justify-between rounded-xl border border-stone-200 bg-white p-3.5 transition hover:border-gold-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700">
                  <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                    {t.email}
                  </span>
                  <input
                    type="checkbox"
                    checked={channels.email}
                    onChange={(e) =>
                      handleChannelChange('email', e.target.checked)
                    }
                    className="h-4.5 w-4.5 rounded accent-gold-600"
                  />
                </label>
                <label className="shadow-xs flex cursor-pointer items-center justify-between rounded-xl border border-stone-200 bg-white p-3.5 transition hover:border-gold-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700">
                  <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                    {t.whatsapp}
                  </span>
                  <input
                    type="checkbox"
                    checked={channels.whatsapp}
                    onChange={(e) =>
                      handleChannelChange('whatsapp', e.target.checked)
                    }
                    className="h-4.5 w-4.5 rounded accent-gold-600"
                  />
                </label>
                <label className="shadow-xs flex cursor-pointer items-center justify-between rounded-xl border border-stone-200 bg-white p-3.5 transition hover:border-gold-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700">
                  <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                    {t.pushNotifs}
                  </span>
                  <input
                    type="checkbox"
                    checked={channels.push}
                    onChange={(e) =>
                      handleChannelChange('push', e.target.checked)
                    }
                    className="h-4.5 w-4.5 rounded accent-gold-600"
                  />
                </label>
              </div>
            </div>

            {/* Order Notifications */}
            <div className="border-t border-stone-200/60 pt-5 dark:border-stone-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                {t.orderUpdates}
              </h3>
              <div className="mt-3 space-y-2.5">
                {[
                  {
                    key: 'confirmation',
                    label: t.orderConfirmation,
                  },
                  { key: 'shipping', label: t.dispatchedTracking },
                  {
                    key: 'delivery',
                    label: t.outForDelivery,
                  },
                  {
                    key: 'refunds',
                    label: t.returnRefund,
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="shadow-xs flex cursor-pointer items-center justify-between rounded-xl border border-stone-200/80 bg-white px-4 py-3 transition hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800/60"
                  >
                    <span className="text-sm font-medium text-stone-800 dark:text-stone-200">
                      {item.label}
                    </span>
                    <input
                      type="checkbox"
                      checked={(orderNotifs as any)[item.key]}
                      onChange={(e) =>
                        handleOrderNotifChange(item.key, e.target.checked)
                      }
                      className="h-4.5 w-4.5 rounded accent-gold-600"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Marketing Notifications */}
            <div className="border-t border-stone-200/60 pt-5 dark:border-stone-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                {t.promotionsOffers}
              </h3>
              <div className="mt-3 space-y-2.5">
                {[
                  {
                    key: 'offers',
                    label: t.specialOffers,
                  },
                  {
                    key: 'newCollections',
                    label: t.newLaunches,
                  },
                  {
                    key: 'flashSales',
                    label: t.limitedGold,
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="shadow-xs flex cursor-pointer items-center justify-between rounded-xl border border-stone-200/80 bg-white px-4 py-3 transition hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800/60"
                  >
                    <span className="text-sm font-medium text-stone-800 dark:text-stone-200">
                      {item.label}
                    </span>
                    <input
                      type="checkbox"
                      checked={(marketingNotifs as any)[item.key]}
                      onChange={(e) =>
                        handleMarketingNotifChange(item.key, e.target.checked)
                      }
                      className="h-4.5 w-4.5 rounded accent-gold-600"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Privacy & Security */}
        <section className="rounded-2xl border border-gold-200/60 bg-[#FCFBF7] p-6 shadow-sm sm:p-7 dark:border-gold-500/20 dark:bg-[#1c1a19]">
          <div className="flex items-center space-x-3.5 border-b border-stone-200/60 pb-4 dark:border-stone-800">
            <div className="rounded-xl bg-gold-100/80 p-2.5 text-gold-800 dark:bg-gold-950/60 dark:text-gold-300">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900 sm:text-xl dark:text-white">
                {t.privacyTitle}
              </h2>
              <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-300">
                {t.privacySubtitle}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {/* Password */}
            <div className="p-4.5 shadow-xs flex items-center justify-between rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
              <div className="flex items-center space-x-3.5">
                <div className="rounded-lg bg-stone-100 p-2 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-serif text-sm font-bold text-stone-900 sm:text-base dark:text-white">
                    {t.password}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-stone-500 dark:text-stone-300">
                    {t.passwordDesc}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-bold text-stone-800 transition hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
              >
                {t.changePassword}
              </button>
            </div>

            {/* Active Sessions */}
            <div className="p-4.5 shadow-xs rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
              <p className="mb-3 font-serif text-sm font-bold text-stone-900 sm:text-base dark:text-white">
                {t.activeDevices}
              </p>
              <div className="space-y-3.5">
                {activeSessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <p className="flex items-center gap-2 font-medium text-stone-900 dark:text-stone-200">
                        {sess.device}
                        {sess.isCurrent && (
                          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            {t.currentSession}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-stone-500 dark:text-stone-300">
                        {sess.location} • {sess.lastActive}
                      </p>
                    </div>
                    {!sess.isCurrent && (
                      <button
                        type="button"
                        onClick={() => toast.success('Signed out from device')}
                        className="text-xs font-bold text-rose-600 hover:underline dark:text-rose-400"
                      >
                        {t.signOut}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Danger Zone: Delete Account */}
            <div className="p-4.5 rounded-xl border border-rose-200 bg-rose-50/60 dark:border-rose-950/40 dark:bg-rose-950/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-serif text-sm font-bold text-rose-900 sm:text-base dark:text-rose-300">
                    {t.deleteAccount}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-rose-700 dark:text-rose-300/90">
                    {t.deleteAccountDesc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="shadow-xs rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700"
                >
                  {t.deleteAccount}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Saved Addresses & Payment Methods Shortcuts */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/account/addresses"
            className="group flex items-center justify-between rounded-2xl border border-gold-200/60 bg-[#FCFBF7] p-5 shadow-sm transition hover:border-gold-300 dark:border-gold-500/20 dark:bg-[#1c1a19] dark:hover:border-gold-500/40"
          >
            <div className="flex items-center space-x-3.5">
              <div className="rounded-xl bg-gold-100/80 p-2.5 text-gold-800 dark:bg-gold-950/60 dark:text-gold-300">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-stone-900 dark:text-white">
                  {t.savedAddresses}
                </h3>
                <p className="mt-0.5 text-xs font-medium text-stone-500 dark:text-stone-300">
                  {t.savedAddressesDesc}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-stone-400 transition-transform group-hover:translate-x-1 group-hover:text-stone-700 dark:text-stone-500 dark:group-hover:text-stone-300" />
          </Link>

          <div className="flex items-center justify-between rounded-2xl border border-gold-200/60 bg-[#FCFBF7] p-5 shadow-sm dark:border-gold-500/20 dark:bg-[#1c1a19]">
            <div className="flex items-center space-x-3.5">
              <div className="rounded-xl bg-gold-100/80 p-2.5 text-gold-800 dark:bg-gold-950/60 dark:text-gold-300">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-stone-900 dark:text-white">
                  {t.savedPayment}
                </h3>
                <p className="mt-0.5 text-xs font-medium text-stone-500 dark:text-stone-300">
                  {t.savedPaymentDesc}
                </p>
              </div>
            </div>
            <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold uppercase tracking-wider text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              {t.tokenized}
            </span>
          </div>
        </section>

        {/* Section 6: Legal & About */}
        <section className="rounded-2xl border border-gold-200/60 bg-[#FCFBF7] p-6 shadow-sm sm:p-7 dark:border-gold-500/20 dark:bg-[#1c1a19]">
          <div className="flex items-center space-x-3.5 border-b border-stone-200/60 pb-4 dark:border-stone-800">
            <div className="rounded-xl bg-gold-100/80 p-2.5 text-gold-800 dark:bg-gold-950/60 dark:text-gold-300">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900 sm:text-xl dark:text-white">
                {t.legalTitle}
              </h2>
              <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-300">
                {t.legalSubtitle}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
            <Link
              href="/terms-and-conditions"
              className="rounded-xl p-2.5 font-medium text-stone-700 transition hover:bg-stone-100 hover:text-gold-700 dark:text-stone-200 dark:hover:bg-stone-800 dark:hover:text-gold-400"
            >
              {t.terms}
            </Link>
            <Link
              href="/privacy-policy"
              className="rounded-xl p-2.5 font-medium text-stone-700 transition hover:bg-stone-100 hover:text-gold-700 dark:text-stone-200 dark:hover:bg-stone-800 dark:hover:text-gold-400"
            >
              {t.privacyPolicy}
            </Link>
            <Link
              href="/return-policy"
              className="rounded-xl p-2.5 font-medium text-stone-700 transition hover:bg-stone-100 hover:text-gold-700 dark:text-stone-200 dark:hover:bg-stone-800 dark:hover:text-gold-400"
            >
              {t.returnPolicy}
            </Link>
            <Link
              href="/shipping-policy"
              className="rounded-xl p-2.5 font-medium text-stone-700 transition hover:bg-stone-100 hover:text-gold-700 dark:text-stone-200 dark:hover:bg-stone-800 dark:hover:text-gold-400"
            >
              {t.shippingPolicy}
            </Link>
            <Link
              href="/data-deletion"
              className="rounded-xl p-2.5 font-medium text-stone-700 transition hover:bg-stone-100 hover:text-gold-700 dark:text-stone-200 dark:hover:bg-stone-800 dark:hover:text-gold-400"
            >
              {t.dataDeletion}
            </Link>
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-stone-200/60 pt-4 text-xs text-stone-500 sm:flex-row dark:border-stone-800 dark:text-stone-400">
            <div className="flex items-center space-x-2">
              <span className="font-serif font-bold text-stone-800 dark:text-stone-200">
                RUHVI JEWELS
              </span>
              <span>• {t.version} 1.0.0</span>
            </div>
            <p>© 2026 Ruhvi Jewels. {t.rightsReserved}</p>
          </div>
        </section>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="backdrop-blur-xs fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-stone-200 bg-white p-6 text-stone-800 shadow-2xl dark:border-stone-800 dark:bg-stone-900">
            <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white">
              {t.updatePassword}
            </h3>
            <form onSubmit={handlePasswordChange} className="space-y-4 text-sm">
              <div>
                <label className="mb-1.5 block font-semibold text-stone-800 dark:text-stone-200">
                  {t.newPasswordLabel}
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t.minCharacters}
                  className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50 dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:placeholder:text-stone-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-semibold text-stone-800 dark:text-stone-200">
                  {t.confirmPasswordLabel}
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.repeatPassword}
                  className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50 dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:placeholder:text-stone-500"
                />
              </div>
              <div className="flex justify-end space-x-3 border-t border-stone-100 pt-4 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="rounded-xl px-4 py-2.5 font-semibold text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={changingPass}
                  className="rounded-xl bg-gold-600 px-5 py-2.5 font-bold text-white shadow-sm transition hover:bg-gold-700 disabled:opacity-50"
                >
                  {changingPass ? t.updating : t.updatePassword}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="backdrop-blur-xs fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-stone-200 bg-white p-6 text-stone-800 shadow-2xl dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="font-serif text-lg font-bold text-rose-900 dark:text-rose-300">
                {t.deleteAccount}
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              {t.deleteWarning}
            </p>
            <div className="flex justify-end space-x-3 border-t border-stone-100 pt-4 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={deletingAccount}
                onClick={handleDeleteAccount}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
              >
                {deletingAccount ? t.deleting : t.confirmDeletion}
              </button>
            </div>
          </div>
        </div>
      )}
    </SpatialPage>
  );
}
