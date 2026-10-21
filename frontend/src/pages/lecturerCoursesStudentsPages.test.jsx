/**
 * Render checks for the lecturer Courses and Students pages after the classroom rebuild.
 * Each page is checked for its real data, its loading and empty states, its failure alert with Try again
 * (a failed load must never look like an empty list), its dialogs (role, name, focus on open, Escape,
 * Tab stays inside) and its handlers. The API is mocked; tests check states, names, calls and navigation,
 * not visual styling.
 */
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { boardsApi, coursesApi, enrollmentsApi, usersApi } from '../services/api';
import LecturerCoursesPage from './lecturer/LecturerCoursesPage';
import LecturerStudentsPage from './lecturer/LecturerStudentsPage';

jest.mock('../services/api', () => ({
  boardsApi: { getAll: jest.fn() },
  coursesApi: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    regenerateInvite: jest.fn(),
    bulkEnroll: jest.fn(),
  },
  enrollmentsApi: { getAll: jest.fn(), create: jest.fn(), update: jest.fn() },
  usersApi: { search: jest.fn() },
}));

const NOW = new Date().toISOString();

// Shows the current path so tests can check where a control sent the user.
function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}{location.search}</p>;
}

const COURSE = {
  id: 1,
  code: 'CS101',
  name: 'Intro to Computing',
  sections: ['A', 'B'],
  student_count: 30,
  board_count: 4,
  is_active: true,
  invite_code: 'ABC123',
  created_at: '2026-01-10T00:00:00Z',
};

const ENROLLMENTS = [
  {
    id: 101,
    student: 7,
    student_details: { id: 7, first_name: 'Ada', last_name: 'Lovelace', username: 'ada', email: 'ada@example.test' },
    course: 1,
    course_details: { code: 'CS101' },
    section: 'A',
    status: 'active',
    enrolled_at: NOW,
  },
  {
    id: 102,
    student: 8,
    student_details: { id: 8, first_name: 'Grace', last_name: 'Hopper', username: 'grace', email: 'grace@example.test' },
    course: 1,
    course_details: { code: 'CS101' },
    section: null,
    status: 'dropped',
    enrolled_at: NOW,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  boardsApi.getAll.mockResolvedValue({ data: [] });
  coursesApi.getAll.mockResolvedValue({ data: [] });
  enrollmentsApi.getAll.mockResolvedValue({ data: [] });
  usersApi.search.mockResolvedValue({ data: [] });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

// React's own warnings (keys, unknown props, invalid nesting) fail the test. Expected app-level error logs
// (failed loads) and act() notices are not counted.
afterEach(() => {
  const reactWarnings = console.error.mock.calls
    .map((c) => c.map(String).join(' '))
    .filter((t) => t.startsWith('Warning:') && !/not wrapped in act|ReactDOMTestUtils\.act/.test(t));
  console.error.mockRestore();
  expect(reactWarnings).toEqual([]);
});

describe('LecturerCoursesPage', () => {
  function renderCourses(onNavigate = jest.fn()) {
    return render(
      <MemoryRouter initialEntries={['/lecturer/courses']}>
        <Where />
        <LecturerCoursesPage onNavigate={onNavigate} />
      </MemoryRouter>
    );
  }

  test('shows a loading status, then course cards with a status badge and real counts', async () => {
    coursesApi.getAll.mockResolvedValue({ data: [COURSE] });
    enrollmentsApi.getAll.mockResolvedValue({ data: ENROLLMENTS });
    renderCourses();
    expect(screen.getByRole('status')).toHaveTextContent('Loading courses');

    const card = await screen.findByRole('article', { name: 'Intro to Computing' });
    expect(within(card).getByText('CS101')).toBeInTheDocument();
    expect(within(card).getByText('Active')).toBeInTheDocument();
    expect(within(card).getByText('30 students')).toBeInTheDocument();
    expect(within(card).getByText('2 sections')).toBeInTheDocument();
    expect(within(card).getByText('4 boards')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('the banner title is the page heading and New Course is named', async () => {
    coursesApi.getAll.mockResolvedValue({ data: [COURSE] });
    renderCourses();
    expect(await screen.findByRole('heading', { level: 1, name: 'My Courses' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New Course' })).toBeInTheDocument();
  });

  test('the section tiles open a labelled dialog that Escape closes', async () => {
    coursesApi.getAll.mockResolvedValue({ data: [COURSE] });
    enrollmentsApi.getAll.mockResolvedValue({ data: ENROLLMENTS });
    renderCourses();

    fireEvent.click(await screen.findByRole('button', { name: /^Section A/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Section A' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByText('Ada Lovelace')).toBeInTheDocument();
    expect(within(dialog).getByText('Students')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  test('a dialog moves focus into its body on open and keeps Tab inside it', async () => {
    renderCourses();
    await screen.findByText('No courses yet');
    fireEvent.click(screen.getByRole('button', { name: 'New Course' }));

    const dialog = await screen.findByRole('dialog', { name: 'Add New Course' });
    expect(within(dialog).getByRole('textbox', { name: 'Course Code' })).toHaveFocus();

    // Last focusable control is Cancel (Add Course is disabled until both fields are filled).
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' });
    cancel.focus();
    fireEvent.keyDown(cancel, { key: 'Tab' });
    expect(within(dialog).getByRole('button', { name: 'Close dialog' })).toHaveFocus();
  });

  test('New Course validates the required fields and creates the course', async () => {
    coursesApi.create.mockResolvedValue({ data: {} });
    renderCourses();
    await screen.findByText('No courses yet');
    fireEvent.click(screen.getByRole('button', { name: 'New Course' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add New Course' });

    const submit = within(dialog).getByRole('button', { name: 'Add Course' });
    expect(submit).toBeDisabled();
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Course Code' }), { target: { value: 'CS202' } });
    expect(submit).toBeDisabled();
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Course Name' }), { target: { value: 'Data' } });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await waitFor(() => expect(coursesApi.create).toHaveBeenCalledWith({ code: 'CS202', name: 'Data', description: '' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  test('a server error on create is shown in the dialog alert and the dialog stays open', async () => {
    coursesApi.create.mockRejectedValue({ response: { data: { code: ['Course code already exists'] } } });
    renderCourses();
    await screen.findByText('No courses yet');
    fireEvent.click(screen.getByRole('button', { name: 'New Course' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add New Course' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Course Code' }), { target: { value: 'CS101' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Course Name' }), { target: { value: 'Dup' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Course' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Course code already exists');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  test('Delete course asks first and only calls the API when the owner confirms', async () => {
    coursesApi.getAll.mockResolvedValue({ data: [COURSE] });
    coursesApi.delete.mockResolvedValue({});
    const confirm = jest.spyOn(window, 'confirm');
    renderCourses();
    const deleteButton = await screen.findByRole('button', { name: 'Delete course' });

    confirm.mockReturnValueOnce(false);
    fireEvent.click(deleteButton);
    expect(confirm).toHaveBeenCalledWith('Are you sure you want to delete this course? This will also remove all enrollments.');
    expect(coursesApi.delete).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true);
    fireEvent.click(deleteButton);
    await waitFor(() => expect(coursesApi.delete).toHaveBeenCalledWith(1));
    confirm.mockRestore();
  });

  test('View Boards navigates to the course boards and New Board reports the course context', async () => {
    coursesApi.getAll.mockResolvedValue({ data: [COURSE] });
    const onNavigate = jest.fn();
    renderCourses(onNavigate);

    fireEvent.click(await screen.findByRole('button', { name: 'View Boards' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/lecturer/boards?course=1');

    fireEvent.click(screen.getByRole('button', { name: 'New Board' }));
    expect(onNavigate).toHaveBeenCalledWith('lecturer-templates', { courseId: 1, courseName: 'CS101' });
  });

  test('Share shows the invite code and link inside a dialog', async () => {
    coursesApi.getAll.mockResolvedValue({ data: [COURSE] });
    renderCourses();
    fireEvent.click(await screen.findByRole('button', { name: 'Share' }));

    const dialog = await screen.findByRole('dialog', { name: 'Share Course' });
    expect(within(dialog).getByText('ABC123')).toBeInTheDocument();
    expect(within(dialog).getByText(/\/join-course\/ABC123$/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Copy invite code' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Copy invite link' })).toBeInTheDocument();
  });

  test('Manage Sections adds a section through the API', async () => {
    coursesApi.getAll.mockResolvedValue({ data: [COURSE] });
    coursesApi.update.mockResolvedValue({ data: {} });
    renderCourses();
    fireEvent.click(await screen.findByRole('button', { name: 'Sections' }));

    const dialog = await screen.findByRole('dialog', { name: 'Manage Sections' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Add Section' }), { target: { value: 'C' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(coursesApi.update).toHaveBeenCalledWith(1, { sections: ['A', 'B', 'C'] }));
  });

  test('a section with enrolled students cannot be removed and says why', async () => {
    coursesApi.getAll.mockResolvedValue({ data: [COURSE] });
    enrollmentsApi.getAll.mockResolvedValue({ data: ENROLLMENTS });
    renderCourses();
    fireEvent.click(await screen.findByRole('button', { name: 'Sections' }));
    const dialog = await screen.findByRole('dialog', { name: 'Manage Sections' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cannot remove: has students' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Cannot remove section with enrolled students');
    expect(coursesApi.update).not.toHaveBeenCalled();
  });

  test('List View hides the section tiles and reports the pressed state', async () => {
    coursesApi.getAll.mockResolvedValue({ data: [COURSE] });
    enrollmentsApi.getAll.mockResolvedValue({ data: ENROLLMENTS });
    renderCourses();
    const sectionsView = await screen.findByRole('button', { name: 'Sections View' });
    expect(sectionsView).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^Section A/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'List View' }));
    expect(screen.getByRole('button', { name: 'List View' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: /^Section A/ })).not.toBeInTheDocument();
  });

  test('no courses shows one empty note, not invented cards', async () => {
    renderCourses();
    expect(await screen.findByRole('heading', { name: 'No courses yet' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Courses' })).not.toBeInTheDocument();
  });

  test('a failed load shows an alert with Try again, not the empty note, and Try again reloads', async () => {
    coursesApi.getAll.mockRejectedValueOnce(new Error('offline'));
    coursesApi.getAll.mockResolvedValueOnce({ data: [COURSE] });
    renderCourses();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your courses or enrolments.');
    expect(screen.queryByRole('heading', { name: 'No courses yet' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('article', { name: 'Intro to Computing' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('LecturerStudentsPage', () => {
  function renderStudents() {
    return render(
      <MemoryRouter>
        <LecturerStudentsPage />
      </MemoryRouter>
    );
  }

  async function loadStudentsPage() {
    coursesApi.getAll.mockResolvedValue({ data: [COURSE] });
    enrollmentsApi.getAll.mockResolvedValue({ data: ENROLLMENTS });
    renderStudents();
    return screen.findByRole('region', { name: 'Students table' });
  }

  test('shows a loading status, then stats and rows with a status badge per student', async () => {
    coursesApi.getAll.mockResolvedValue({ data: [COURSE] });
    enrollmentsApi.getAll.mockResolvedValue({ data: ENROLLMENTS });
    renderStudents();
    expect(screen.getByRole('status')).toHaveTextContent('Loading students');

    const table = await screen.findByRole('region', { name: 'Students table' });
    expect(within(table).getByText('Ada Lovelace')).toBeInTheDocument();
    expect(within(table).getByText('grace@example.test')).toBeInTheDocument();
    expect(within(table).getByText('Active')).toBeInTheDocument();
    expect(within(table).getByText('Dropped')).toBeInTheDocument();
    expect(screen.getByText('Total Enrolled')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('search narrows by name, and a miss shows one note', async () => {
    await loadStudentsPage();
    const search = screen.getByRole('searchbox', { name: 'Search students' });

    fireEvent.change(search, { target: { value: 'grace' } });
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'zzz' } });
    expect(screen.getByRole('heading', { name: 'No students found' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Students table' })).not.toBeInTheDocument();
  });

  test('no enrolments shows the one empty note', async () => {
    renderStudents();
    expect(await screen.findByRole('heading', { name: 'No students enrolled yet' })).toBeInTheDocument();
  });

  test('selecting students and applying a bulk status change calls the API for each', async () => {
    enrollmentsApi.update.mockResolvedValue({ data: {} });
    await loadStudentsPage();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Ada Lovelace' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Grace Hopper' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Selected (2)' }));

    const dialog = await screen.findByRole('dialog', { name: 'Bulk Edit Students' });
    expect(within(dialog).getByText('2 students selected')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole('combobox', { name: 'Change Status' }), { target: { value: 'completed' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply Changes' }));

    await waitFor(() => expect(enrollmentsApi.update).toHaveBeenCalledWith(101, { status: 'completed' }));
    expect(enrollmentsApi.update).toHaveBeenCalledWith(102, { status: 'completed' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  test('the select-all checkbox selects every visible row', async () => {
    await loadStudentsPage();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all students' }));
    expect(screen.getByRole('checkbox', { name: 'Select Ada Lovelace' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Select Grace Hopper' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Edit Selected (2)' })).toBeInTheDocument();
  });

  test('inline edit saves the section and status through the API', async () => {
    enrollmentsApi.update.mockResolvedValue({ data: {} });
    await loadStudentsPage();

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit enrollment' })[0]);
    expect(screen.getByRole('combobox', { name: 'Section for Ada Lovelace' })).toHaveValue('A');
    fireEvent.change(screen.getByRole('combobox', { name: 'Status for Ada Lovelace' }), { target: { value: 'dropped' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(enrollmentsApi.update).toHaveBeenCalledWith(101, { section: 'A', status: 'dropped' }));
  });

  test('View student opens a labelled dialog that Escape closes', async () => {
    await loadStudentsPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'View student' })[0]);

    const dialog = await screen.findByRole('dialog', { name: 'Student Details' });
    expect(within(dialog).getByText('ada@example.test')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  test('the table region can be reached from the keyboard and is labelled for scrolling', async () => {
    const table = await loadStudentsPage();
    expect(table).toHaveAttribute('tabindex', '0');
    expect(screen.getByText('Swipe sideways to see every column.')).toBeInTheDocument();
  });

  test('the add dialog searches users, selects one with aria-pressed, and enrols through the API', async () => {
    usersApi.search.mockResolvedValue({
      data: [{ id: 9, first_name: 'Linus', last_name: 'T', email_hint: 'l***@example.test', role: 'student' }],
    });
    enrollmentsApi.create.mockResolvedValue({ data: {} });
    await loadStudentsPage();

    fireEvent.click(screen.getByRole('button', { name: 'Add Student' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add Students' });
    expect(within(dialog).getByRole('searchbox', { name: 'Search Students' })).toHaveFocus();

    fireEvent.change(within(dialog).getByRole('searchbox', { name: 'Search Students' }), { target: { value: 'lin' } });
    const result = await within(dialog).findByRole('button', { name: /Linus T/ });
    expect(result).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(result);
    expect(result).toHaveAttribute('aria-pressed', 'true');

    fireEvent.change(within(dialog).getByRole('combobox', { name: 'Course' }), { target: { value: '1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add 1 Student' }));

    await waitFor(() => expect(enrollmentsApi.create).toHaveBeenCalledWith({ student: 9, course: 1, section: '' }));
    expect(await within(dialog).findByRole('status')).toHaveTextContent('1 student(s) enrolled successfully.');
  });

  test('a failed load shows an alert with Try again, not zero stats or an empty table', async () => {
    coursesApi.getAll.mockResolvedValue({ data: [COURSE] });
    enrollmentsApi.getAll.mockRejectedValueOnce(new Error('offline'));
    enrollmentsApi.getAll.mockResolvedValueOnce({ data: ENROLLMENTS });
    renderStudents();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your students.');
    expect(screen.queryByText('Total Enrolled')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'No students enrolled yet' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('region', { name: 'Students table' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
