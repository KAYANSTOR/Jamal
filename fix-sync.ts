import fs from 'fs';
const path = '/app/applet/server.ts';
let content = fs.readFileSync(path, 'utf8');

const replacement = `
          } else if (op.entityType === 'warehouses') {
            await tx.insert(warehouses).values({ ...op.payload, organizationId: orgId }).onConflictDoUpdate({ target: warehouses.id, set: { ...op.payload, organizationId: orgId } });
          } else if (op.entityType === 'categories') {
            await tx.insert(categories).values({ ...op.payload, organizationId: orgId }).onConflictDoUpdate({ target: categories.id, set: { ...op.payload, organizationId: orgId } });
          } else if (op.entityType === 'units') {
            await tx.insert(units).values({ ...op.payload, organizationId: orgId }).onConflictDoUpdate({ target: units.id, set: { ...op.payload, organizationId: orgId } });
          } else if (op.entityType === 'products') {
            await tx.insert(products).values({ ...op.payload, organizationId: orgId }).onConflictDoUpdate({ target: products.id, set: { ...op.payload, organizationId: orgId } });
          } else if (op.entityType === 'productVariants') {
            await tx.insert(productVariants).values({ ...op.payload, organizationId: orgId }).onConflictDoUpdate({ target: productVariants.id, set: { ...op.payload, organizationId: orgId } });
          } else if (op.entityType === 'suppliers') {
            await tx.insert(suppliers).values({ ...op.payload, organizationId: orgId }).onConflictDoUpdate({ target: suppliers.id, set: { ...op.payload, organizationId: orgId } });
          } else if (op.entityType === 'departments') {
            await tx.insert(departments).values({ ...op.payload, organizationId: orgId }).onConflictDoUpdate({ target: departments.id, set: { ...op.payload, organizationId: orgId } });
          } else if (op.entityType === 'CREATE_SUPPLIER_PAYMENT') {`;

content = content.replace("} else if (op.entityType === 'CREATE_SUPPLIER_PAYMENT') {", replacement);

fs.writeFileSync(path, content);
