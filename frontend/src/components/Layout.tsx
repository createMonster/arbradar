'use client';

import React, { useState } from 'react';
import { Settings, Globe, Menu, Cpu, TrendingUp, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Language } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  language: Language;
  onLanguageChange: (language: Language) => void;
}

export default function Layout({ children, language, onLanguageChange }: LayoutProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const t = {
    en: {
      title: 'ArbRadar',
      subtitle: 'Crypto Arbitrage Monitor',
      tagline: 'Real-time arbitrage opportunities across major exchanges',
      settings: 'Settings',
      language: 'Language',
      english: 'English',
      chinese: '中文',
      theme: 'Appearance',
      light: 'Light',
      dark: 'Dark',
      updateInterval: 'Update Interval',
      seconds: 'seconds',
      enableSound: 'Enable Sound Alerts',
      menu: 'Menu',
      features: 'Features',
      realTime: 'Real-time monitoring',
      multiExchange: 'Multi-exchange coverage',
      smartAlerts: 'Smart notifications'
    },
    zh: {
      title: 'ArbRadar',
      subtitle: '加密货币套利监控',
      tagline: '实时监控主要交易所套利机会',
      settings: '设置',
      language: '语言',
      english: 'English',
      chinese: '中文',
      theme: '外观',
      light: '浅色',
      dark: '深色',
      updateInterval: '更新间隔',
      seconds: '秒',
      enableSound: '启用声音提醒',
      menu: '菜单',
      features: '功能特色',
      realTime: '实时监控',
      multiExchange: '多交易所覆盖',
      smartAlerts: '智能提醒'
    }
  };

  const currentTranslations = t[language];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="italian-header">
        <div className="container mx-auto px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-italian-sky-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Cpu className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-xl font-bold text-primary-solid tracking-tight">
                    {currentTranslations.title}
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {currentTranslations.subtitle}
                  </p>
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-3">
              {/* Dark Mode Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleDarkMode}
                className="italian-button-secondary h-10 w-10 p-0 transition-italian"
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              {/* Language Toggle */}
              <Select value={language} onValueChange={(value: Language) => onLanguageChange(value)}>
                <SelectTrigger className="italian-input w-[140px] h-10">
                  <Globe className="mr-2 h-4 w-4 text-italian-sky-500" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="italian-card border-0">
                  <SelectItem value="en">{currentTranslations.english}</SelectItem>
                  <SelectItem value="zh">{currentTranslations.chinese}</SelectItem>
                </SelectContent>
              </Select>

              {/* Settings */}
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button className="italian-button-secondary h-10 px-4 transition-italian">
                    <Settings className="mr-2 h-4 w-4" />
                    {currentTranslations.settings}
                  </Button>
                </DialogTrigger>
                <DialogContent className="italian-card border-0 sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">
                      {currentTranslations.settings}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {currentTranslations.language}
                      </label>
                      <Select value={language} onValueChange={(value: Language) => onLanguageChange(value)}>
                        <SelectTrigger className="italian-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="italian-card border-0">
                          <SelectItem value="en">{currentTranslations.english}</SelectItem>
                          <SelectItem value="zh">{currentTranslations.chinese}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {currentTranslations.theme}
                      </label>
                      <Select value={isDarkMode ? "dark" : "light"} onValueChange={(value) => {
                        if ((value === "dark") !== isDarkMode) {
                          toggleDarkMode();
                        }
                      }}>
                        <SelectTrigger className="italian-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="italian-card border-0">
                          <SelectItem value="light">{currentTranslations.light}</SelectItem>
                          <SelectItem value="dark">{currentTranslations.dark}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {currentTranslations.updateInterval}
                      </label>
                      <Select defaultValue="50">
                        <SelectTrigger className="italian-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="italian-card border-0">
                          <SelectItem value="10">10 {currentTranslations.seconds}</SelectItem>
                          <SelectItem value="30">30 {currentTranslations.seconds}</SelectItem>
                          <SelectItem value="50">50 {currentTranslations.seconds}</SelectItem>
                          <SelectItem value="60">60 {currentTranslations.seconds}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="italian-button-secondary h-10 w-10 p-0 transition-italian">
                    <Menu className="h-4 w-4" />
                    <span className="sr-only">{currentTranslations.menu}</span>
                  </Button>
                </SheetTrigger>
                <SheetContent className="italian-card border-0">
                  <div className="flex flex-col space-y-6 mt-8">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {currentTranslations.language}
                      </label>
                      <Select value={language} onValueChange={(value: Language) => onLanguageChange(value)}>
                        <SelectTrigger className="apple-input">
                          <Globe className="mr-2 h-4 w-4 text-apple-blue" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="apple-card border-0">
                          <SelectItem value="en">{currentTranslations.english}</SelectItem>
                          <SelectItem value="zh">{currentTranslations.chinese}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      onClick={() => setIsSettingsOpen(true)}
                      className="apple-button-secondary justify-start h-12"
                    >
                      <Settings className="mr-3 h-4 w-4" />
                      {currentTranslations.settings}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      onClick={toggleDarkMode}
                      className="apple-button-secondary justify-start h-12"
                    >
                      {isDarkMode ? <Sun className="mr-3 h-4 w-4" /> : <Moon className="mr-3 h-4 w-4" />}
                      {currentTranslations.theme}
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm mt-24">
        <div className="container mx-auto px-6 py-12">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-apple-green" />
                <span>{currentTranslations.realTime}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-apple-blue" />
                <span>{currentTranslations.multiExchange}</span>
              </div>
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500 max-w-md mx-auto leading-relaxed">
              {language === 'en' 
                ? '© 2024 ArbRadar. Advanced cryptocurrency arbitrage monitoring with real-time price spreads across major exchanges.'
                : '© 2024 ArbRadar. 先进的加密货币套利监控，实时监控主要交易所价差。'
              }
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 