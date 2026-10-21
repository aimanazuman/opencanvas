import { filesApi } from '../services/api';
import { uploadErrorMessage, uploadFile } from './fileUpload';

jest.mock('../services/api', () => ({
  filesApi: { upload: jest.fn() },
}));

const DEFAULT = 'The file could not be uploaded.';
const QUOTA = 'Storage quota exceeded. Please free up space or contact an administrator.';

const errorWith = (data) => ({ response: { status: 400, data } });

describe('uploadErrorMessage', () => {
  test('shows the server text of a quota error sent as a top-level JSON array', () => {
    expect(uploadErrorMessage(errorWith([QUOTA]))).toBe(QUOTA);
  });

  test('reads the first usable string of an array', () => {
    expect(uploadErrorMessage(errorWith(['', '  ', 'Second']))).toBe('Second');
    expect(uploadErrorMessage(errorWith([null, 42, 'Third']))).toBe('Third');
  });

  test('reads a bare string body', () => {
    expect(uploadErrorMessage(errorWith('Too big'))).toBe('Too big');
  });

  test('reads field errors shaped as {field: [...]}', () => {
    expect(uploadErrorMessage(errorWith({ file: ['No file was submitted.'] }))).toBe('No file was submitted.');
    expect(uploadErrorMessage(errorWith({ file: 'Bad file' }))).toBe('Bad file');
  });

  test('prefers detail, then error, then non_field_errors, then file and board', () => {
    expect(uploadErrorMessage(errorWith({ file: ['f'], detail: 'd' }))).toBe('d');
    expect(uploadErrorMessage(errorWith({ file: ['f'], error: 'e' }))).toBe('e');
    expect(uploadErrorMessage(errorWith({ board: ['b'], non_field_errors: ['n'] }))).toBe('n');
    expect(uploadErrorMessage(errorWith({ board: ['b'] }))).toBe('b');
  });

  test('falls back to other keys and nested objects', () => {
    expect(uploadErrorMessage(errorWith({ quota: [QUOTA] }))).toBe(QUOTA);
    expect(uploadErrorMessage(errorWith({ errors: { file: ['Deep'] } }))).toBe('Deep');
  });

  test('stops at the maximum nesting depth', () => {
    const deep = { a: { b: { c: { d: { e: { f: 'too deep' } } } } } };
    expect(uploadErrorMessage(errorWith(deep))).toBe(DEFAULT);
  });

  test('empty and unusable bodies give the default message', () => {
    expect(uploadErrorMessage(errorWith([]))).toBe(DEFAULT);
    expect(uploadErrorMessage(errorWith({}))).toBe(DEFAULT);
    expect(uploadErrorMessage(errorWith(''))).toBe(DEFAULT);
    expect(uploadErrorMessage(errorWith('   '))).toBe(DEFAULT);
    expect(uploadErrorMessage(errorWith(null))).toBe(DEFAULT);
    expect(uploadErrorMessage(errorWith(undefined))).toBe(DEFAULT);
    expect(uploadErrorMessage(errorWith([{}, []]))).toBe(DEFAULT);
  });

  test('ignores markup from a proxy error page', () => {
    expect(uploadErrorMessage(errorWith('<html><body>413 Request Entity Too Large</body></html>'))).toBe(DEFAULT);
    expect(uploadErrorMessage(errorWith(['<b>bold</b>']))).toBe(DEFAULT);
  });

  test('caps very long server text', () => {
    const long = 'x'.repeat(1000);
    expect(uploadErrorMessage(errorWith([long]))).toHaveLength(300);
  });

  test('network failures without a response give the default message', () => {
    expect(uploadErrorMessage(new Error('Network Error'))).toBe(DEFAULT);
    expect(uploadErrorMessage(undefined)).toBe(DEFAULT);
    expect(uploadErrorMessage(null)).toBe(DEFAULT);
  });
});

describe('uploadFile', () => {
  let alertSpy;
  let errorSpy;

  beforeEach(() => {
    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    alertSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test('alerts the quota message when the server rejects an upload over quota', async () => {
    filesApi.upload.mockRejectedValueOnce(errorWith([QUOTA]));
    const file = new File(['abc'], 'big.pdf', { type: 'application/pdf' });

    const result = await uploadFile(file);

    expect(result).toBeNull();
    expect(alertSpy).toHaveBeenCalledWith(`Upload failed: ${QUOTA}`);
  });

  test('alerts the default message for an unknown failure', async () => {
    filesApi.upload.mockRejectedValueOnce(new Error('boom'));
    const file = new File(['abc'], 'a.txt', { type: 'text/plain' });

    await uploadFile(file);

    expect(alertSpy).toHaveBeenCalledWith(`Upload failed: ${DEFAULT}`);
  });
});
