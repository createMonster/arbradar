'use client';

import React, { useState } from 'react';
import { Settings, Globe, Menu, X } from 'lucide-react';
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

  const t = {
    en: {
      title: 'Crypto Arbitrage Monitor',
      settings: 'Settings',
      language: 'Language',
      english: 'English',
      chinese: '中文',
      theme: 'Theme',
      light: 'Light',
      dark: 'Dark',
      updateInterval: 'Update Interval',
      seconds: 'seconds',
      enableSound: 'Enable Sound Alerts',
      menu: 'Menu'
    },
    zh: {
      title: '加密货币套利监控',
      settings: '设置',
      language: '语言',
      english: 'English',
      chinese: '中文',
      theme: '主题',
      light: '浅色',
      dark: '深色',
      updateInterval: '更新间隔',
      seconds: '秒',
      enableSound: '启用声音提醒',
      menu: '菜单'
    }
  };

  const currentTranslations = t[language];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                {currentTranslations.title}
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-2">
              {/* Language Toggle */}
              <Select value={language} onValueChange={(value: Language) => onLanguageChange(value)}>
                <SelectTrigger className="w-[140px]">
                  <Globe className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{currentTranslations.english}</SelectItem>
                  <SelectItem value="zh">{currentTranslations.chinese}</SelectItem>
                </SelectContent>
              </Select>

              {/* Settings */}
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="mr-2 h-4 w-4" />
                    {currentTranslations.settings}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{currentTranslations.settings}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label className="text-right text-sm font-medium">
                        {currentTranslations.language}
                      </label>
                      <Select value={language} onValueChange={(value: Language) => onLanguageChange(value)}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">{currentTranslations.english}</SelectItem>
                          <SelectItem value="zh">{currentTranslations.chinese}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label className="text-right text-sm font-medium">
                        {currentTranslations.theme}
                      </label>
                      <Select defaultValue="light">
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">{currentTranslations.light}</SelectItem>
                          <SelectItem value="dark">{currentTranslations.dark}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label className="text-right text-sm font-medium">
                        {currentTranslations.updateInterval}
                      </label>
                      <Select defaultValue="10">
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 {currentTranslations.seconds}</SelectItem>
                          <SelectItem value="10">10 {currentTranslations.seconds}</SelectItem>
                          <SelectItem value="30">30 {currentTranslations.seconds}</SelectItem>
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
                  <Button variant="outline" size="sm">
                    <Menu className="h-4 w-4" />
                    <span className="sr-only">{currentTranslations.menu}</span>
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <div className="flex flex-col space-y-4 mt-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        {currentTranslations.language}
                      </label>
                      <Select value={language} onValueChange={(value: Language) => onLanguageChange(value)}>
                        <SelectTrigger>
                          <Globe className="mr-2 h-4 w-4" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">{currentTranslations.english}</SelectItem>
                          <SelectItem value="zh">{currentTranslations.chinese}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsSettingsOpen(true)}
                      className="justify-start"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      {currentTranslations.settings}
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            {language === 'en' 
              ? '© 2024 Crypto Arbitrage Monitor. Real-time cryptocurrency price spreads across major exchanges.'
              : '© 2024 加密货币套利监控. 主要交易所实时加密货币价差监控.'
            }
          </div>
        </div>
      </footer>
    </div>
  );
} 