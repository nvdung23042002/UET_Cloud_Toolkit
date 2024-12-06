export const handler = async (event) => {
  console.log('This is a Sample Lambda Function');
  const response = {
    statusCode: 200,
    body: JSON.stringify('This is a Sample Lambda Function'),
  };
  return response;
};
