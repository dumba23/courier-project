import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const LANGUAGE_STORAGE_KEY = 'courier_language'

const translations = {
  en: {
    common: {
      loading: 'Loading...',
      cancel: 'Cancel',
      save: 'Save',
      active: 'Active',
      inactive: 'Inactive',
      name: 'Name',
      status: 'Status',
      city: 'City',
      email: 'Email',
      password: 'Password',
      phone: 'Phone',
      edit: 'Edit',
      add: 'Add',
      closeSidebar: 'Close sidebar',
      openSidebar: 'Open sidebar',
    },
    nav: {
      navigation: 'Navigation',
      deliveries: 'Deliveries',
      canceled: 'Canceled',
      couriers: 'Couriers',
      partners: 'Partners',
      courierPayroll: 'Courier payroll',
      partnerPayroll: 'Partner payroll',
      commentTemplates: 'Comment templates',
      districts: 'Districts',
      cities: 'Cities',
      streets: 'Streets',
      logout: 'Log out',
    },
    lang: {
      ka: 'ქართული',
      en: 'English',
      switchToKa: 'Switch to Georgian',
      switchToEn: 'Switch to English',
    },
    login: {
      title: 'Login',
      signIn: 'Log in',
      signingIn: 'Signing in...',
    },
    districts: {
      title: 'Districts',
      add: 'Add district',
      edit: 'Edit district',
      created: 'District created.',
      updated: 'District updated.',
      empty: 'No districts.',
      couriers: 'Couriers',
    },
    districtStreets: {
      title: 'District Streets',
      add: 'Add street',
      edit: 'Edit street',
      added: 'Street added.',
      updated: 'Street updated.',
      district: 'District',
      street: 'Street',
      aliases: 'Aliases',
      empty: 'No district streets.',
      selectDistrict: 'Select district',
    },
    cities: {
      title: 'Cities',
      add: 'Add city',
      edit: 'Edit city',
      created: 'City created.',
      updated: 'City updated.',
      empty: 'No cities.',
      update: 'Update city',
      create: 'Create city',
    },
    couriers: {
      title: 'Couriers',
      add: 'Add courier',
      edit: 'Edit courier',
      created: 'Courier created.',
      updated: 'Courier updated.',
      empty: 'No couriers.',
      carPlate: 'Car plate',
      tariff: 'Tariff',
      leavePassword: 'Leave password empty to keep the current password.',
      setPassword: 'Set the password for this courier account.',
    },
    commentTemplates: {
      title: 'Courier comment templates',
      add: 'Add template',
      edit: 'Edit template',
      created: 'Template created.',
      updated: 'Template updated.',
      deleted: 'Template deleted.',
      empty: 'No templates.',
      template: 'Template',
      delete: 'Delete',
    },
    partners: {
      title: 'Partners',
      add: 'Add partner',
      edit: 'Edit partner',
      created: 'Partner created.',
      updated: 'Partner updated.',
      empty: 'No partners.',
      pickupAddress: 'Pickup address',
      defaultTariff: 'Default tariff',
      tariffPerKg: 'Tariff per kg',
      defaultTariffRanges: 'Default tariff ranges',
      cityOverrides: 'City overrides',
      overrideRanges: 'Override ranges',
      overrideTariff: 'Override tariff',
      selectCity: 'Select city',
      hint: 'Default tariff will be used for all cities until you add an override.',
      leavePassword: 'Leave password empty to keep the current password.',
      confirmPassword: 'Confirm password',
      upToKg: 'Up to kg',
      price: 'Price',
      noRanges: 'Per kg',
      cityOverride: 'city override',
      cityOverridesPlural: 'city overrides',
    },
    deliveryItems: {
      activeTitle: 'Deliveries',
      canceledTitle: 'Canceled Deliveries',
      multiDistricts: 'Multiple districts',
      updating: 'Updating...',
      assignDistricts: 'Assign districts to filtered deliveries',
      downloadTemplate: 'Download import template',
      import: 'Import delivery items',
      add: 'Add delivery items',
      columnSettings: 'Column settings',
      statusColors: 'Status colors',
      selectAll: 'Select all',
      clear: 'Clear',
    },
  },
  ka: {
    common: {
      loading: 'იტვირთება...',
      cancel: 'გაუქმება',
      save: 'შენახვა',
      active: 'აქტიური',
      inactive: 'არააქტიური',
      name: 'სახელი',
      status: 'სტატუსი',
      city: 'ქალაქი',
      email: 'მეილი',
      password: 'პაროლი',
      phone: 'ტელეფონი',
      edit: 'რედაქტირება',
      add: 'დამატება',
      closeSidebar: 'გვერდითი მენიუს დახურვა',
      openSidebar: 'გვერდითი მენიუს გახსნა',
    },
    nav: {
      navigation: 'ნავიგაცია',
      deliveries: 'მიწოდებები',
      canceled: 'გაუქმებული',
      couriers: 'კურიერები',
      partners: 'პარტნიორები',
      courierPayroll: 'კურიერის ანაზღაურება',
      partnerPayroll: 'პარტნიორის ანაზღაურება',
      commentTemplates: 'კომენტარის შაბლონები',
      districts: 'უბნები',
      cities: 'ქალაქები',
      streets: 'ქუჩები',
      logout: 'გასვლა',
    },
    lang: {
      ka: 'ქართული',
      en: 'English',
      switchToKa: 'გადართე ქართულზე',
      switchToEn: 'გადართე ინგლისურზე',
    },
    login: {
      title: 'შესვლა',
      signIn: 'შესვლა',
      signingIn: 'შედის...',
    },
    districts: {
      title: 'უბნები',
      add: 'უბნის დამატება',
      edit: 'უბნის რედაქტირება',
      created: 'უბანი დაემატა.',
      updated: 'უბანი განახლდა.',
      empty: 'უბნები ვერ მოიძებნა.',
      couriers: 'კურიერები',
    },
    districtStreets: {
      title: 'უბნის ქუჩები',
      add: 'ქუჩის დამატება',
      edit: 'ქუჩის რედაქტირება',
      added: 'ქუჩა დაემატა.',
      updated: 'ქუჩა განახლდა.',
      district: 'უბანი',
      street: 'ქუჩა',
      aliases: 'ალტერნატიული სახელები',
      empty: 'ქუჩები ვერ მოიძებნა.',
      selectDistrict: 'აირჩიე უბანი',
    },
    cities: {
      title: 'ქალაქები',
      add: 'ქალაქის დამატება',
      edit: 'ქალაქის რედაქტირება',
      created: 'ქალაქი დაემატა.',
      updated: 'ქალაქი განახლდა.',
      empty: 'ქალაქები ვერ მოიძებნა.',
      update: 'ქალაქის განახლება',
      create: 'ქალაქის შექმნა',
    },
    couriers: {
      title: 'კურიერები',
      add: 'კურიერის დამატება',
      edit: 'კურიერის რედაქტირება',
      created: 'კურიერი დაემატა.',
      updated: 'კურიერი განახლდა.',
      empty: 'კურიერები ვერ მოიძებნა.',
      carPlate: 'მანქანის ნომერი',
      tariff: 'ტარიფი',
      leavePassword: 'პაროლის ცარიელად დატოვების შემთხვევაში მიმდინარე პაროლი დარჩება.',
      setPassword: 'დააყენე პაროლი ამ კურიერის ანგარიშისთვის.',
    },
    commentTemplates: {
      title: 'კურიერის კომენტარის შაბლონები',
      add: 'შაბლონის დამატება',
      edit: 'შაბლონის რედაქტირება',
      created: 'შაბლონი დაემატა.',
      updated: 'შაბლონი განახლდა.',
      deleted: 'შაბლონი წაიშალა.',
      empty: 'შაბლონები ვერ მოიძებნა.',
      template: 'შაბლონი',
      delete: 'წაშლა',
    },
    partners: {
      title: 'პარტნიორები',
      add: 'პარტნიორის დამატება',
      edit: 'პარტნიორის რედაქტირება',
      created: 'პარტნიორი დაემატა.',
      updated: 'პარტნიორი განახლდა.',
      empty: 'პარტნიორები ვერ მოიძებნა.',
      pickupAddress: 'წამოღების მისამართი',
      defaultTariff: 'ნაგულისხმევი ტარიფი',
      tariffPerKg: 'ტარიფი კგ-ზე',
      defaultTariffRanges: 'ნაგულისხმევი ტარიფის შკალა',
      cityOverrides: 'ქალაქის გადაფარვები',
      overrideRanges: 'გადაფარვის შკალა',
      overrideTariff: 'გადაფარვის ტარიფი',
      selectCity: 'აირჩიე ქალაქი',
      hint: 'თუ გადაფარვა არ არსებობს, ყველა ქალაქზე ნაგულისხმევი ტარიფი იმუშავებს.',
      leavePassword: 'პაროლის ცარიელად დატოვების შემთხვევაში მიმდინარე პაროლი დარჩება.',
      confirmPassword: 'გაიმეორე პაროლი',
      upToKg: 'მდე კგ',
      price: 'ფასი',
      noRanges: 'კგ ტარიფი',
      cityOverride: 'ქალაქის გადაფარვა',
      cityOverridesPlural: 'ქალაქის გადაფარვა',
    },
    deliveryItems: {
      activeTitle: 'მიწოდებები',
      canceledTitle: 'გაუქმებული მიწოდებები',
      multiDistricts: 'ბევრი უბანი',
      updating: 'ახლდება...',
      assignDistricts: 'გაფილტრულ მიწოდებებზე უბნების მინიჭება',
      downloadTemplate: 'იმპორტის შაბლონის ჩამოტვირთვა',
      import: 'მიწოდებების იმპორტი',
      add: 'მიწოდებების დამატება',
      columnSettings: 'სვეტების პარამეტრები',
      statusColors: 'სტატუსების ფერები',
      selectAll: 'ყველას მონიშვნა',
      clear: 'გასუფთავება',
    },
  },
}

const I18nContext = createContext(null)

function readStoredLanguage() {
  if (typeof window === 'undefined') {
    return 'ka'
  }

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return storedLanguage === 'en' ? 'en' : 'ka'
}

function getTranslationValue(language, key) {
  return key.split('.').reduce((current, part) => current?.[part], translations[language])
}

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(readStoredLanguage)

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  }, [language])

  const value = useMemo(() => ({
    language,
    setLanguage,
    t(key) {
      return getTranslationValue(language, key)
        ?? getTranslationValue('ka', key)
        ?? key
    },
  }), [language])

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useI18n must be used within I18nProvider.')
  }

  return context
}
