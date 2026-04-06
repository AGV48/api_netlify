const { Pool } = require("pg");

const pool = new Pool({
  connectionString: 'postgresql://AGV:TtfvlRibHh93@ep-round-tree-a551uewg-pooler.us-east-2.aws.neon.tech/practica_cpi?sslmode=require',
  ssl: { rejectUnauthorized: false },
});

// Crear tabla si no existe al arrancar
const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id                   SERIAL PRIMARY KEY,
      codigo_sap           VARCHAR(50),
      identificador_fiscal VARCHAR(100),
      nombre               VARCHAR(255),
      telefono             VARCHAR(50),
      direccion            VARCHAR(500),
      pais                 VARCHAR(10),
      creado_en            TIMESTAMP DEFAULT NOW()
    )
  `);
};

exports.handler = async (event) => {

  // ── 1. Probar conexión y crear tabla ─────────────────────────
  try {
    await initDB();
  } catch (dbInitError) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Fallo al conectar con la base de datos",
        detalle: dbInitError.message,
      }),
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  if (!event.body || event.body.trim() === "") {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Body vacío o nulo" }),
    };
  }

  try {
    // ── 2. Parsear body ───────────────────────────────────────────
    let rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf-8")
      : event.body;

    let raw;
    try {
      raw = JSON.parse(rawBody);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Body no es JSON válido",
          bodyRecibido: rawBody,
        }),
      };
    }

    // ── 3. Extraer objeto anidado ─────────────────────────────────
    const cliente = raw.Prueba_Capa_Request || raw;

    // ── 4. Validar campos ─────────────────────────────────────────
    const camposRequeridos = [
      "codigo_sap", "identificador_fiscal",
      "Nombre", "Telefono", "Direccion", "Pais",
    ];

    const camposFaltantes = camposRequeridos.filter((c) => !cliente[c]);
    if (camposFaltantes.length > 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Faltan campos requeridos",
          campos_faltantes: camposFaltantes,
          dataRecibida: cliente,
        }),
      };
    }

    // ── 5. Insertar ───────────────────────────────────────────────
    const result = await pool.query(
      `INSERT INTO clientes 
        (codigo_sap, identificador_fiscal, nombre, telefono, direccion, pais, creado_en)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id`,
      [
        cliente.codigo_sap,
        cliente.identificador_fiscal,
        cliente.Nombre,
        cliente.Telefono,
        cliente.Direccion,
        cliente.Pais,
      ]
    );

    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        id: result.rows[0].id,
        mensaje: "Cliente insertado correctamente",
      }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Error al insertar",
        detalle: error.message,
      }),
    };
  }
};