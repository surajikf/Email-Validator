# Bulk Email Validator

A modern, high-performance web application to validate email addresses in bulk.

## Features
- **Bulk Processing**: Handle 50,000+ emails via CSV/Excel.
- **Multi-layer Validation**: Syntax, DNS/MX, SMTP, Disposable, Catch-all.
- **Real-time Progress**: Live dashboard with status updates.
- **Fast & Lightweight**: Built with Node.js Streams and BullMQ.

## Tech Stack
- **Frontend**: Next.js 14, Tailwind CSS, Framer Motion.
- **Backend**: Node.js, Express, BullMQ.
- **Database/Queue**: Redis.

## Prerequisites
- Node.js 18+
- Redis (Running locally on port 6379)

## Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```
Server runs on `http://localhost:3001`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
App runs on `http://localhost:3000`.

## API Endpoints
- `POST /api/upload`: Upload CSV/Excel file.
- `GET /api/status/:id`: Check job status.
