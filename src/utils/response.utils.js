export const sendResponse = (res, { status = 200, data = {}, message = '' }) => {
  res.status(status).json({
    status: 'success',
    message,
    data,
  });
}; 