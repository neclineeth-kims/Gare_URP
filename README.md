# Unit Rate Calculation Application

A comprehensive web application for construction and engineering project cost analysis, built with Next.js and Prisma.

## Overview

This application provides a complete solution for calculating unit rates in construction projects, managing Bill of Quantities (BoQ), and performing detailed resource analysis.

### Key Features

🏗️ **Resource Management**
- Labor cost calculation with productivity factors
- Material cost tracking with waste factors  
- Equipment cost analysis with depreciation and operational costs

📊 **Analysis Engine**
- Resource explosion algorithm for detailed cost breakdown
- Equipment Direct Cost (EDC) calculations
- Automated unit rate computation

📋 **Bill of Quantities (BoQ)**
- Project-level BoQ management
- Coefficient-based analysis integration
- Real-time cost calculations

📈 **Reporting & Export**
- Detailed resource explosion reports
- Excel import/export functionality
- PDF report generation

## Technology Stack

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes, Prisma ORM
- **Database:** SQLite (development), PostgreSQL (production ready)
- **UI Components:** Shadcn/ui components
- **Styling:** Tailwind CSS with custom configurations

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd unit-rate-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up the template database (required before creating projects):
```bash
npm run init:template
```
This creates `data/unitrate_main/` with empty schema and base currency (USD).

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Environment Setup

Create a `.env` file in the root directory (used for migrations and template setup):
```env
DATABASE_URL="file:./dev.db"
```

### Project-Based Architecture

- **Landing page** – Choose to start a new project or open an existing one.
- **New project** – Creates a directory under `data/projects/<name>/` with a copy of the template database.
- **Existing project** – Opens the project’s database and shows all labor, materials, equipment, and analysis.

## Application Architecture

### Core Concepts

1. **Projects** - Top-level containers for cost analyses
2. **Resources** - Labor, materials, and equipment with associated costs
3. **Analysis Items** - Unit rate calculations combining multiple resources
4. **BoQ Items** - Project deliverables referencing analysis items with coefficients

### Key Algorithms

#### Resource Explosion
The application implements a sophisticated resource explosion algorithm that:
- Traces from BoQ items through analysis items to base resources
- Handles equipment sub-resource calculations (operator labor + fuel)
- Aggregates quantities across the entire project hierarchy
- Maintains precision using decimal arithmetic

#### Unit Rate Calculation
Unit rates are calculated using the formula:
```
Unit Rate = (Labor Cost + Material Cost + Equipment Depreciation) / Base Quantity
```

Where Equipment Direct Cost (EDC) = Operator Labor + Fuel costs are included in Labor and Material totals.

## Database Schema

The application uses a normalized relational schema with the following main entities:

- **Projects** - Project metadata and settings
- **Labor/Materials/Equipment** - Resource definitions with cost parameters
- **AnalysisItems** - Unit rate analyses
- **BoQItems** - Bill of quantities entries
- **ResourceUsage** - Many-to-many relationships with quantities and coefficients

## Development Guidelines

### Code Organization
- API routes in `/app/api/`
- Page components in `/app/`
- Reusable components in `/components/`
- Utility functions in `/lib/`
- Database schema in `/prisma/`

### Testing
The application includes comprehensive test data and validation checkpoints. Run the test suite after each development phase to ensure calculations match expected outputs.

### Precision Handling
All monetary and quantity fields use `Decimal` types to avoid floating-point precision issues. This is critical for accurate financial calculations.

## Deployment

The application is designed to deploy seamlessly on platforms like Vercel:

1. Connect your GitHub repository to Vercel
2. Set environment variables (DATABASE_URL for production PostgreSQL)
3. Deploy automatically on git push

For production databases, update the DATABASE_URL to use PostgreSQL instead of SQLite.

## Contributing

This application was built following a strict specification with defined calculation rules and validation checkpoints. When making changes:

1. Ensure all calculations match the expected outputs in the specification
2. Maintain decimal precision for financial calculations  
3. Run the full test suite before committing
4. Follow the established code organization patterns

## License

This project is developed for engineering cost analysis purposes. See LICENSE for details.

---

Built with ❤️ using Next.js and modern web technologies.