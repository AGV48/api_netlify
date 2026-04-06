const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    // ── 1. Parsear body ──────────────────────────────────────────
    let raw;
    try {
      raw = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Body no es JSON válido",
          bodyRecibido: event.body,
        }),
      };
    }

    // ── 2. Extraer objeto anidado si existe ──────────────────────
    // Soporta: {"Prueba_Capa_Request":{...}}  ó  {...} directo
    const cliente = raw.Prueba_Capa_Request || raw;

    // ── 3. Validar campos requeridos ─────────────────────────────
    const camposRequeridos = [
      "codigo_sap",
      "identificador_fiscal",
      "Nombre",
      "Telefono",
      "Direccion",
      "Pais",
    ];

    const camposFaltantes = camposRequeridos.filter((campo) => !cliente[campo]);

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

    // ── 4. Insertar en PostgreSQL ────────────────────────────────
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

    // ── 5. Respuesta exitosa ─────────────────────────────────────
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
    // ── 6. Error detallado ───────────────────────────────────────
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Error interno del servidor",
        detalle: error.message,
      }),
    };
  }
};