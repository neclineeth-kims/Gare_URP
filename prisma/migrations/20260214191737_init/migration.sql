-- CreateTable
CREATE TABLE "currencies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "exchange_rate" DECIMAL NOT NULL DEFAULT 1,
    "is_base" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currency_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "projects_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "labor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "rate" DECIMAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "labor_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "rate" DECIMAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "materials_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "total_value" DECIMAL NOT NULL,
    "depreciation_total" DECIMAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "equipment_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "equipment_resources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipment_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "labor_id" TEXT,
    "material_id" TEXT,
    "quantity" DECIMAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "equipment_resources_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "equipment_resources_labor_id_fkey" FOREIGN KEY ("labor_id") REFERENCES "labor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "equipment_resources_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "analysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "base_quantity" DECIMAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "analysis_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "analysis_resources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysis_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "labor_id" TEXT,
    "material_id" TEXT,
    "equipment_id" TEXT,
    "quantity" DECIMAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analysis_resources_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "analysis_resources_labor_id_fkey" FOREIGN KEY ("labor_id") REFERENCES "labor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "analysis_resources_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "analysis_resources_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "boq_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "boq_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "boq_analysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boq_item_id" TEXT NOT NULL,
    "analysis_id" TEXT NOT NULL,
    "coefficient" DECIMAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "boq_analysis_boq_item_id_fkey" FOREIGN KEY ("boq_item_id") REFERENCES "boq_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "boq_analysis_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analysis" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "labor_project_id_code_key" ON "labor"("project_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "materials_project_id_code_key" ON "materials"("project_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_project_id_code_key" ON "equipment"("project_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_resources_equipment_id_labor_id_material_id_key" ON "equipment_resources"("equipment_id", "labor_id", "material_id");

-- CreateIndex
CREATE UNIQUE INDEX "analysis_project_id_code_key" ON "analysis"("project_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "boq_items_project_id_code_key" ON "boq_items"("project_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "boq_analysis_boq_item_id_analysis_id_key" ON "boq_analysis"("boq_item_id", "analysis_id");
