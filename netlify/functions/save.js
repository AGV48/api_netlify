const { Pool } = require("pg");

const pool = new Pool({
  connectionString: 'postgresql://AGV:TtfvlRibHh93@ep-round-tree-a551uewg-pooler.us-east-2.aws.neon.tech/practica_cpi?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {


  // ── Debug: loguear todo lo que llega ──────────────────────────
  console.log("METHOD:", event.httpMethod);
  console.log("HEADERS:", JSON.stringify(event.headers));
  console.log("BODY RAW:", event.body);
  console.log("IS BASE64:", event.isBase64Encoded);

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  // ── Validar que el body no esté vacío ─────────────────────────
  if (!event.body || event.body.trim() === "") {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        error: "Body vacío o nulo",
        method: event.httpMethod,
        headers: event.headers,
      }),
    };
  }

  try {
    // ── Decodificar si viene en base64 ────────────────────────────
    let rawBody = event.body;
    if (event.isBase64Encoded) {
      rawBody = Buffer.from(event.body, "base64").toString("utf-8");
    }

    console.log("BODY PROCESADO:", rawBody);

    // ── Parsear JSON ──────────────────────────────────────────────
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
          parseError: parseError.message,
        }),
      };
    }

    console.log("JSON PARSEADO:", JSON.stringify(raw));

    // ── Extraer objeto anidado si existe ──────────────────────────
    const cliente = raw.Prueba_Capa_Request || raw;

    console.log("CLIENTE:", JSON.stringify(cliente));

    // ── Validar campos requeridos ─────────────────────────────────
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

    // ── Insertar en PostgreSQL ────────────────────────────────────
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
    console.error("ERROR:", error.message, error.stack);
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