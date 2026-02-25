import { describe, it, expect } from 'vitest';
import { createResponsiveLayout } from './useResponsiveLayout';

describe('createResponsiveLayout', () => {
  // -- Device class boundaries --
  it('classifies 375x812 as phone', () => {
    const layout = createResponsiveLayout(375, 812);
    expect(layout.deviceClass).toBe('phone');
    expect(layout.isTablet).toBe(false);
    expect(layout.isLargeTablet).toBe(false);
  });

  it('classifies 599 width as phone (boundary)', () => {
    const layout = createResponsiveLayout(599, 900);
    expect(layout.deviceClass).toBe('phone');
    expect(layout.isTablet).toBe(false);
  });

  it('classifies 600 width as tablet (boundary)', () => {
    const layout = createResponsiveLayout(600, 960);
    expect(layout.deviceClass).toBe('tablet');
    expect(layout.isTablet).toBe(true);
    expect(layout.isLargeTablet).toBe(false);
  });

  it('classifies 839 width as tablet (boundary)', () => {
    const layout = createResponsiveLayout(839, 1100);
    expect(layout.deviceClass).toBe('tablet');
    expect(layout.isTablet).toBe(true);
    expect(layout.isLargeTablet).toBe(false);
  });

  it('classifies 840 width as largeTablet (boundary)', () => {
    const layout = createResponsiveLayout(840, 1180);
    expect(layout.deviceClass).toBe('largeTablet');
    expect(layout.isTablet).toBe(true);
    expect(layout.isLargeTablet).toBe(true);
  });

  // -- Content max width --
  it('phone contentMaxWidth is 560', () => {
    const layout = createResponsiveLayout(375, 812);
    expect(layout.contentMaxWidth).toBe(560);
  });

  it('tablet contentMaxWidth is 720', () => {
    const layout = createResponsiveLayout(600, 960);
    expect(layout.contentMaxWidth).toBe(720);
  });

  it('largeTablet contentMaxWidth is 960', () => {
    const layout = createResponsiveLayout(840, 1180);
    expect(layout.contentMaxWidth).toBe(960);
  });

  // -- List columns --
  it('phone has 1 list column', () => {
    const layout = createResponsiveLayout(375, 812);
    expect(layout.listColumns).toBe(1);
  });

  it('tablet has 2 list columns', () => {
    const layout = createResponsiveLayout(600, 960);
    expect(layout.listColumns).toBe(2);
  });

  it('largeTablet has 3 list columns', () => {
    const layout = createResponsiveLayout(840, 1180);
    expect(layout.listColumns).toBe(3);
  });

  // -- Card columns --
  it('phone has 3 card columns', () => {
    const layout = createResponsiveLayout(375, 812);
    expect(layout.cardColumns).toBe(3);
  });

  it('tablet has 3 card columns', () => {
    const layout = createResponsiveLayout(600, 960);
    expect(layout.cardColumns).toBe(3);
  });

  it('largeTablet has 4 card columns', () => {
    const layout = createResponsiveLayout(840, 1180);
    expect(layout.cardColumns).toBe(4);
  });

  // -- Spacing --
  it('phone has gutter=12, padding=16', () => {
    const layout = createResponsiveLayout(375, 812);
    expect(layout.gutterWidth).toBe(12);
    expect(layout.contentPadding).toBe(16);
  });

  it('tablet has gutter=16, padding=24', () => {
    const layout = createResponsiveLayout(600, 960);
    expect(layout.gutterWidth).toBe(16);
    expect(layout.contentPadding).toBe(24);
  });

  it('largeTablet has gutter=16, padding=24', () => {
    const layout = createResponsiveLayout(840, 1180);
    expect(layout.gutterWidth).toBe(16);
    expect(layout.contentPadding).toBe(24);
  });

  // -- Screen dimensions passed through --
  it('passes through screen dimensions', () => {
    const layout = createResponsiveLayout(412, 915);
    expect(layout.screenWidth).toBe(412);
    expect(layout.screenHeight).toBe(915);
  });
});
