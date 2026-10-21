/* eslint-disable testing-library/no-node-access, testing-library/no-container */
/**
 * Classroom component set: render, variants, decorative and ruled props, the scroll-reveal hook
 * (reduced motion, no-JS fallback), and a guard against forbidden hues and gradients.
 */
import React, { createRef } from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Check } from 'lucide-react';
import {
  ClassroomShell, ChalkboardHeader, WoodFrame, PaperPanel, StickyNote, CorkBoard,
  ChalkBadge, TimetableGrid, ClassroomButton, ClassroomField,
} from './index';
import useScrollReveal from '../../hooks/useScrollReveal';

let observers;
let savedObserver;
let savedMatchMedia;

function setReducedMotion(matches) {
  window.matchMedia = (query) => ({
    matches: matches && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false; },
  });
}

beforeEach(() => {
  savedObserver = window.IntersectionObserver;
  savedMatchMedia = window.matchMedia;
  observers = [];
  window.IntersectionObserver = class {
    constructor(cb, options) {
      this.cb = cb;
      this.options = options;
      this.observe = jest.fn();
      this.unobserve = jest.fn();
      this.disconnect = jest.fn();
      observers.push(this);
    }
  };
  setReducedMotion(false);
});

afterEach(() => {
  window.IntersectionObserver = savedObserver;
  window.matchMedia = savedMatchMedia;
  document.documentElement.className = '';
});

describe('ClassroomShell', () => {
  test('renders a scoped root on the wall colour with no ruled paper', () => {
    const { container } = render(<ClassroomShell>Body</ClassroomShell>);
    expect(container.firstChild).toHaveClass('classroom', 'bg-wall', 'text-ink');
    expect(container.firstChild).not.toHaveClass('paper-rules');
  });

  test('paper variant adds the ruled paper class', () => {
    const { container } = render(<ClassroomShell variant="paper">Body</ClassroomShell>);
    expect(container.firstChild).toHaveClass('paper-rules', 'classroom');
  });

  test('renders the element named by as', () => {
    render(<ClassroomShell as="main">Body</ClassroomShell>);
    expect(screen.getByRole('main')).toHaveClass('classroom');
  });

  test('forwards the ref to the root element', () => {
    const ref = createRef();
    const { container } = render(<ClassroomShell ref={ref}>Body</ClassroomShell>);
    expect(ref.current).toBe(container.firstChild);
  });
});

describe('ChalkboardHeader', () => {
  test('renders the title as an h1 with its id inside a wood frame', () => {
    render(<ChalkboardHeader title="Hello board" titleId="t1" />);
    const heading = screen.getByRole('heading', { level: 1, name: 'Hello board' });
    expect(heading).toHaveAttribute('id', 't1');
    expect(heading.closest('.wood-frame')).not.toBeNull();
    expect(heading.closest('.chalkboard')).not.toBeNull();
  });

  test('banner is the default size and compact is smaller', () => {
    const { unmount } = render(<ChalkboardHeader title="Banner" />);
    expect(screen.getByRole('heading', { name: 'Banner' })).toHaveClass('font-hand', 'text-2xl');
    unmount();
    render(<ChalkboardHeader size="compact" title="Compact" />);
    expect(screen.getByRole('heading', { name: 'Compact' })).toHaveClass('text-xl');
  });

  test('hero uses the large title', () => {
    render(<ChalkboardHeader size="hero" title="Big" />);
    expect(screen.getByRole('heading', { name: 'Big' })).toHaveClass('md:text-6xl', 'text-chalk-ink');
  });

  test('compact hides the subtitle under 480 px', () => {
    render(<ChalkboardHeader size="compact" title="T" subtitle="Sub line" />);
    expect(screen.getByText('Sub line')).toHaveClass('hidden', 'min-[480px]:block');
  });

  test('renders eyebrow, subtitle, actions and children', () => {
    render(
      <ChalkboardHeader
        title="T"
        eyebrow={<span>Eyebrow</span>}
        subtitle="Sub"
        actions={<button type="button">Act</button>}
      >
        <span>Child</span>
      </ChalkboardHeader>
    );
    expect(screen.getByText('Eyebrow')).toBeInTheDocument();
    expect(screen.getByText('Sub')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Act' })).toBeInTheDocument();
    expect(screen.getByText('Child')).toBeInTheDocument();
  });

  test('tray is decorative and only renders when asked', () => {
    const { container, unmount } = render(<ChalkboardHeader title="T" tray />);
    const tray = container.querySelector('.bg-wood-light');
    expect(tray).toHaveAttribute('aria-hidden', 'true');
    unmount();
    const view = render(<ChalkboardHeader title="T" />);
    expect(view.container.querySelector('.bg-wood-light')).toBeNull();
  });

  test('enter adds the motion-safe rise to the content', () => {
    render(<ChalkboardHeader title="Risen" enter />);
    expect(screen.getByRole('heading', { name: 'Risen' }).parentElement).toHaveClass('motion-safe:animate-oc-rise');
  });

  test('underline is hidden from assistive tech', () => {
    const { container } = render(<ChalkboardHeader title="T" underline />);
    expect(container.querySelector('.bg-chalk-dust[aria-hidden="true"]')).not.toBeNull();
  });

  test('as changes the heading level', () => {
    render(<ChalkboardHeader as="h2" title="Sub heading" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Sub heading' })).toBeInTheDocument();
  });
});

describe('WoodFrame', () => {
  test('defaults to the md frame', () => {
    const { container } = render(<WoodFrame>Inside</WoodFrame>);
    expect(container.firstChild).toHaveClass('wood-frame', 'rounded-lg', 'p-2.5', 'md:p-3');
  });

  test('sm is a thin 4 px edge', () => {
    const { container } = render(<WoodFrame width="sm">Inside</WoodFrame>);
    expect(container.firstChild).toHaveClass('p-1');
    expect(container.firstChild).not.toHaveClass('p-2.5');
  });

  test('forwards className and as', () => {
    render(<WoodFrame as="section" className="extra" aria-label="frame">Inside</WoodFrame>);
    expect(screen.getByLabelText('frame').tagName).toBe('SECTION');
    expect(screen.getByLabelText('frame')).toHaveClass('extra');
  });
});

describe('PaperPanel', () => {
  test('default is a bordered paper panel with padding and no rules', () => {
    const { container } = render(<PaperPanel>Body</PaperPanel>);
    const el = container.firstChild;
    expect(el).toHaveClass('bg-paper', 'border', 'border-line', 'shadow-float', 'rounded-lg', 'p-3');
    expect(el).not.toHaveClass('paper-rules');
    expect(el).not.toHaveClass('paper-lines');
  });

  test('ruled without margin uses the lines-only class', () => {
    const { container } = render(<PaperPanel ruled>Body</PaperPanel>);
    expect(container.firstChild).toHaveClass('paper-lines');
    expect(container.firstChild).not.toHaveClass('paper-rules');
  });

  test('ruled with margin adds the red margin and clears it with padding', () => {
    const { container } = render(<PaperPanel ruled margin>Body</PaperPanel>);
    expect(container.firstChild).toHaveClass('paper-rules', 'pl-10');
  });

  test('margin without ruled does nothing', () => {
    const { container } = render(<PaperPanel margin>Body</PaperPanel>);
    expect(container.firstChild).not.toHaveClass('paper-rules');
    expect(container.firstChild).not.toHaveClass('paper-lines');
  });

  test('white tone and padded false', () => {
    const { container } = render(<PaperPanel tone="white" padded={false}>Body</PaperPanel>);
    expect(container.firstChild).toHaveClass('bg-surface');
    expect(container.firstChild).not.toHaveClass('bg-paper');
    expect(container.firstChild).not.toHaveClass('p-3');
  });

  test('flat drops the border, radius and shadow', () => {
    const { container } = render(<PaperPanel flat>Body</PaperPanel>);
    expect(container.firstChild).not.toHaveClass('border', 'shadow-float', 'rounded-lg');
  });

  test('as renders the named element', () => {
    const { container } = render(<PaperPanel as="section">Body</PaperPanel>);
    expect(container.firstChild.tagName).toBe('SECTION');
  });
});

describe('StickyNote', () => {
  test('defaults to amber and maps every allowed colour', () => {
    const { container, unmount } = render(<StickyNote>Note</StickyNote>);
    expect(container.firstChild).toHaveClass('bg-note-amber', 'shadow-float', 'rounded-sm', 'text-ink', 'p-3');
    unmount();
    ['azure', 'amber', 'green', 'teal', 'orange'].forEach((color) => {
      const view = render(<StickyNote color={color}>Note</StickyNote>);
      expect(view.container.firstChild).toHaveClass(`bg-note-${color}`);
      view.unmount();
    });
  });

  test('an unknown colour falls back to amber', () => {
    const { container } = render(<StickyNote color="magenta-ish">Note</StickyNote>);
    expect(container.firstChild).toHaveClass('bg-note-amber');
  });

  test('tilt needs decorative and stays within -2, 0, 2 degrees below 480 px', () => {
    const { container, unmount } = render(<StickyNote decorative rotate={2}>Note</StickyNote>);
    expect(container.firstChild).toHaveClass('min-[480px]:rotate-2');
    unmount();
    {
      const view = render(<StickyNote decorative rotate={-2}>Note</StickyNote>);
      expect(view.container.firstChild).toHaveClass('min-[480px]:-rotate-2');
      view.unmount();
    }
    {
      const view = render(<StickyNote decorative rotate={0}>Note</StickyNote>);
      expect(view.container.firstChild.className).not.toMatch(/rotate/);
      view.unmount();
    }
  });

  test('rotate is ignored without decorative, and values outside the set are ignored', () => {
    const { container, unmount } = render(<StickyNote rotate={2}>Note</StickyNote>);
    expect(container.firstChild.className).not.toMatch(/rotate/);
    unmount();
    const view = render(<StickyNote decorative rotate={1}>Note</StickyNote>);
    expect(view.container.firstChild.className).not.toMatch(/rotate/);
  });

  test('pinned adds a decorative pin', () => {
    const { container, unmount } = render(<StickyNote pinned>Note</StickyNote>);
    expect(container.firstChild.querySelector('[aria-hidden="true"]')).toHaveClass('bg-danger');
    unmount();
    const view = render(<StickyNote>Note</StickyNote>);
    expect(view.container.firstChild.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  test('as renders an article and spacious uses p-5', () => {
    const { container } = render(<StickyNote as="article" spacious>Note</StickyNote>);
    expect(container.firstChild.tagName).toBe('ARTICLE');
    expect(container.firstChild).toHaveClass('p-5');
  });
});

describe('CorkBoard', () => {
  test('is a cork section that clips horizontal overflow and lays out the items', () => {
    const { container } = render(
      <CorkBoard as="section" header={<h2>Templates</h2>}>
        <li>One</li>
        <li>Two</li>
      </CorkBoard>
    );
    const section = container.firstChild;
    expect(section.tagName).toBe('SECTION');
    expect(section).toHaveClass('cork-board', 'overflow-x-clip', 'px-4');
    expect(screen.getByRole('heading', { name: 'Templates' })).toBeInTheDocument();
    expect(screen.getByRole('list')).toHaveClass('grid', 'sm:grid-cols-2', 'lg:grid-cols-3');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  test('five layout gives the HomePage row', () => {
    render(<CorkBoard layout="five"><li>One</li></CorkBoard>);
    expect(screen.getByRole('list')).toHaveClass('lg:grid-cols-5');
    expect(screen.getByRole('list')).not.toHaveClass('lg:grid-cols-3');
  });

  test('padded false drops the section padding', () => {
    const { container } = render(<CorkBoard padded={false}><li>One</li></CorkBoard>);
    expect(container.firstChild).not.toHaveClass('px-4');
  });
});

describe('ChalkBadge', () => {
  test('renders text with an icon', () => {
    const { container } = render(<ChalkBadge label="Saved" icon={Check} tone="success" />);
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  test.each([
    ['neutral', ['bg-surface-hover', 'text-ink']],
    ['success', ['bg-success-tint', 'text-success']],
    ['warning', ['bg-warning-tint', 'text-warning']],
    ['danger', ['bg-danger-tint', 'text-danger']],
  ])('tone %s uses its tint and solid text', (tone, classes) => {
    const { container } = render(<ChalkBadge label="Status" icon={Check} tone={tone} />);
    expect(container.firstChild).toHaveClass(...classes);
  });

  test('every tone keeps both the icon and the label', () => {
    ['neutral', 'success', 'warning', 'danger'].forEach((tone) => {
      const view = render(<ChalkBadge label={`Label ${tone}`} icon={Check} tone={tone} />);
      expect(view.container.querySelector('svg')).not.toBeNull();
      expect(screen.getByText(`Label ${tone}`)).toBeInTheDocument();
      view.unmount();
    });
  });

  test('chalk surface uses the chalk fill whatever the tone', () => {
    const { container } = render(<ChalkBadge label="On chalk" icon={Check} tone="danger" surface="chalk" />);
    expect(container.firstChild).toHaveClass('bg-chalk-deep', 'text-chalk-ink');
    expect(container.firstChild).not.toHaveClass('bg-danger-tint');
  });
});

describe('TimetableGrid', () => {
  const rows = [
    {
      label: 'Period 1',
      cells: [
        { label: 'Course Material', className: 'bg-note-azure' },
        { label: 'Quiz Board', className: 'bg-note-orange' },
      ],
    },
  ];

  test('is a real table named by the caption with column and row headers', () => {
    render(
      <TimetableGrid caption="Week" corner={<span>Corner</span>} columns={['Mon', 'Tue']} rows={rows} />
    );
    screen.getByRole('table', { name: 'Week' });
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getAllByRole('rowheader')).toHaveLength(1);
    expect(screen.getByText('Corner')).toBeInTheDocument();
    expect(screen.getByText('Course Material')).toHaveClass('bg-note-azure');
  });

  test('the wrapper is a labelled, focusable scroll region', () => {
    render(<TimetableGrid caption="Week" columns={['Mon']} rows={[]} />);
    const region = screen.getByRole('region', { name: 'Week' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toHaveClass('overflow-x-auto');
  });

  test('onCellSelect turns cells into buttons that report the cell', () => {
    const onCellSelect = jest.fn();
    render(<TimetableGrid caption="Week" columns={['Mon', 'Tue']} rows={rows} onCellSelect={onCellSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Quiz Board' }));
    expect(onCellSelect).toHaveBeenCalledWith({ row: 'Period 1', column: 'Tue', cell: rows[0].cells[1] });
  });

  test('without onCellSelect there are no buttons', () => {
    render(<TimetableGrid caption="Week" columns={['Mon', 'Tue']} rows={rows} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

describe('ClassroomButton', () => {
  test('is a button at least 44 px square and defaults to secondary', () => {
    render(<ClassroomButton>Save</ClassroomButton>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toHaveAttribute('type', 'button');
    expect(btn).toHaveClass('min-h-[44px]', 'min-w-[44px]', 'btn-motion', 'bg-surface');
  });

  test('a named variant passes through', () => {
    render(<ClassroomButton variant="primary">Go</ClassroomButton>);
    expect(screen.getByRole('button', { name: 'Go' })).toHaveClass('bg-accent');
  });

  test('onChalk swaps to chalk fill, chalkboard text and a chalk-ink focus ring', () => {
    render(<ClassroomButton onChalk>Chalk</ClassroomButton>);
    const btn = screen.getByRole('button', { name: 'Chalk' });
    expect(btn).toHaveClass('bg-chalk-ink', 'text-chalk-board', 'focus-visible:outline-chalk-ink');
    expect(btn).not.toHaveClass('bg-surface');
  });

  test('forwards clicks and disabled state', () => {
    const onClick = jest.fn();
    const { unmount } = render(<ClassroomButton onClick={onClick}>Click</ClassroomButton>);
    fireEvent.click(screen.getByRole('button', { name: 'Click' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    unmount();
    render(<ClassroomButton onChalk disabled>Off</ClassroomButton>);
    expect(screen.getByRole('button', { name: 'Off' })).toBeDisabled();
  });
});

describe('ClassroomField', () => {
  test('shows a visible label and a 44 px control', () => {
    render(<ClassroomField label="Email" />);
    const input = screen.getByLabelText('Email');
    expect(input.tagName).toBe('INPUT');
    expect(input).toHaveClass('min-h-[44px]');
  });

  test('shows the error with an icon and marks the control invalid', () => {
    render(<ClassroomField label="Name" error="Required" />);
    const input = screen.getByLabelText('Name');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Required');
    expect(screen.getByText('Required').closest('p')).toHaveClass('text-danger');
  });

  test('controlClassName is merged onto the control', () => {
    render(<ClassroomField label="Notes" as="textarea" controlClassName="extra-class" />);
    const control = screen.getByLabelText('Notes');
    expect(control).toHaveClass('extra-class', 'min-h-[44px]');
  });
});

describe('useScrollReveal', () => {
  function Probe(props) {
    const ref = useScrollReveal(props);
    return (
      <div ref={ref}>
        <p className="scroll-reveal">first</p>
        <p className="scroll-reveal">second</p>
      </div>
    );
  }

  test('observes each reveal element, reveals on intersection and cleans up', () => {
    const { unmount } = render(<Probe />);
    expect(observers).toHaveLength(1);
    expect(observers[0].options).toEqual({ threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    expect(observers[0].observe).toHaveBeenCalledTimes(2);
    expect(document.documentElement).toHaveClass('js-reveal');

    const first = screen.getByText('first');
    act(() => observers[0].cb([{ isIntersecting: true, target: first }]));
    expect(first).toHaveClass('is-visible');
    expect(observers[0].unobserve).toHaveBeenCalledWith(first);
    expect(screen.getByText('second')).not.toHaveClass('is-visible');

    unmount();
    expect(observers[0].disconnect).toHaveBeenCalled();
    expect(document.documentElement).not.toHaveClass('js-reveal');
  });

  test('once false hides an element again when it leaves the viewport', () => {
    render(<Probe once={false} threshold={0.3} />);
    expect(observers[0].options.threshold).toBe(0.3);
    const first = screen.getByText('first');
    act(() => observers[0].cb([{ isIntersecting: true, target: first }]));
    expect(first).toHaveClass('is-visible');
    act(() => observers[0].cb([{ isIntersecting: false, target: first }]));
    expect(first).not.toHaveClass('is-visible');
    expect(observers[0].unobserve).not.toHaveBeenCalled();
  });

  test('reduced motion marks every element visible at once and creates no observer', () => {
    setReducedMotion(true);
    render(<Probe />);
    expect(observers).toHaveLength(0);
    expect(screen.getByText('first')).toHaveClass('is-visible');
    expect(screen.getByText('second')).toHaveClass('is-visible');
    expect(document.documentElement).not.toHaveClass('js-reveal');
  });

  test('without IntersectionObserver every element is visible at once', () => {
    window.IntersectionObserver = undefined;
    render(<Probe />);
    expect(screen.getByText('first')).toHaveClass('is-visible');
    expect(screen.getByText('second')).toHaveClass('is-visible');
  });

  test('no reveal elements means no observer', () => {
    const Empty = () => {
      const ref = useScrollReveal();
      return <div ref={ref}><p>plain</p></div>;
    };
    render(<Empty />);
    expect(observers).toHaveLength(0);
  });

  test('CSS hides reveal content only under the js-reveal class and keeps the chalk focus ring', () => {
    const css = fs.readFileSync(path.join(__dirname, '../../index.css'), 'utf8');
    expect(css).toContain('html:not(.js-reveal) .scroll-reveal');
    expect(css).toContain('.classroom .chalkboard :focus-visible');
  });
});

describe('palette guard', () => {
  const FORBIDDEN = /\b(indigo|purple|violet|pink|rose|fuchsia|magenta|lavender)\b|bg-gradient|(?:^|[\s"'`])(?:from|via|to)-[a-z0-9[]/i;

  test('no classroom source or the hook uses a forbidden hue or a gradient', () => {
    const dir = __dirname;
    const hook = path.join(__dirname, '../../hooks/useScrollReveal.js');
    const files = fs.readdirSync(dir)
      .filter((f) => /\.(js|jsx)$/.test(f) && !f.includes('.test.'))
      .map((f) => path.join(dir, f))
      .concat(hook);
    const violations = [];
    files.forEach((file) => {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (FORBIDDEN.test(line)) violations.push(`${path.basename(file)}:${i + 1}: ${line.trim()}`);
      });
    });
    expect(files.length).toBeGreaterThan(10);
    expect(violations).toEqual([]);
  });
});
