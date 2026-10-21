import React from 'react';
import WoodFrame from './WoodFrame';
import cx from './cx';

// Static lookup per size. `hero` matches the HomePage hero exactly.
const SIZE = {
  hero: {
    board: 'px-5 py-10 text-center md:px-14 md:py-16',
    title: 'font-hand text-4xl leading-tight text-chalk-ink md:text-6xl',
    subtitle: 'mx-auto mt-6 max-w-2xl text-base leading-relaxed text-chalk-dust md:text-lg',
    actions: 'mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row',
    underline: 'mx-auto mt-2',
  },
  banner: {
    board: 'p-6',
    title: 'font-hand text-2xl leading-tight text-chalk-ink',
    subtitle: 'mt-1 text-sm text-chalk-dust',
    actions: 'mt-4 flex flex-wrap items-center gap-3',
    underline: 'mt-2',
  },
  compact: {
    board: 'px-4 py-3',
    title: 'font-hand text-xl leading-tight text-chalk-ink',
    // Subtitle is dropped under 480 px to keep the header short.
    subtitle: 'mt-1 hidden text-sm text-chalk-dust min-[480px]:block',
    actions: 'mt-3 flex flex-wrap items-center gap-3',
    underline: 'mt-1',
  },
};

/**
 * Chalkboard header, always inside a WoodFrame. One per screen.
 * `tray` adds the decorative marker tray under the frame (aria-hidden).
 * `enter` plays the reduced-motion-safe rise on the content.
 */
export default function ChalkboardHeader({
  size = 'banner',
  as: Heading = 'h1',
  title,
  titleId,
  subtitle,
  eyebrow,
  actions,
  underline = false,
  enter = false,
  tray = false,
  // Set to false for long titles (40 characters or more): the hand font is for short titles only.
  handTitle = true,
  className = '',
  children,
}) {
  const s = SIZE[size] || SIZE.banner;
  const titleClass = handTitle ? s.title : s.title.replace('font-hand', 'font-sans');
  return (
    <>
      <WoodFrame className={className}>
        <div className={cx('chalkboard rounded-sm', s.board)}>
          <div className={enter ? 'motion-safe:animate-oc-rise' : undefined}>
            {eyebrow}
            {title && (
              <Heading id={titleId} className={cx(titleClass, eyebrow && 'mt-6')}>
                {title}
              </Heading>
            )}
            {underline && (
              <span
                aria-hidden="true"
                className={cx('block h-0.5 w-16 origin-left rounded-full bg-chalk-dust motion-safe:animate-oc-draw', s.underline)}
              />
            )}
            {subtitle && <p className={s.subtitle}>{subtitle}</p>}
            {children}
            {actions && <div className={s.actions}>{actions}</div>}
          </div>
        </div>
      </WoodFrame>
      {tray && (
        <div aria-hidden="true" className="mx-6 flex h-4 items-center justify-center gap-3 rounded-b-md bg-wood-light shadow-float md:mx-12">
          <span className="h-1.5 w-10 rounded-sm bg-paper" />
          <span className="h-1.5 w-8 rounded-sm bg-note-amber" />
          <span className="h-1.5 w-10 rounded-sm bg-accent-200" />
        </div>
      )}
    </>
  );
}
