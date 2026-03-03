export const GET = async () => {
  return new Response(JSON.stringify({ status: "Freelancer Engine Online" }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
