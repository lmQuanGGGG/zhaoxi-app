ZhaoXi 19.0.0 Sprint G Backend
Server-enforced Customer checkout identity boundary.
POST /api/service-requests rejects missing sessions, Guest identities, and non-Customer roles before parsing or creating an order.
Expected verifier: ZhaoXi 19.0.0 Sprint G Backend verified: service-request creation requires a verified Customer session and rejects unauthenticated, Guest, and non-Customer callers PASS.
