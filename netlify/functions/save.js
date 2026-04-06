const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // ✅ Manejo seguro del body
    let data;
    try {
      data = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          error: "Body no es JSON válido", 
          bodyRecibido: event.body  // ← para debug
        }),
      };
    }

    const camposRequeridos = [
      "codigo_sap", "identificador_fiscal",
      "Nombre", "Telefono", "Direccion", "Pais",
    ];

    const camposFaltantes = camposRequeridos.filter((campo) => !data[campo]);

    if (camposFaltantes.length > 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Faltan campos requeridos",
          campos_faltantes: camposFaltantes,
          dataRecibida: data,  // ← para debug
        }),
      };
    }

    const result = await pool.query(
      `INSERT INTO clientes 
        (codigo_sap, identificador_fiscal, nombre, telefono, direccion, pais, creado_en) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
       RETURNING id`,
      [
        data.codigo_sap,
        data.identificador_fiscal,
        data.Nombre,
        data.Telefono,
        data.Direccion,
        data.Pais,
      ]
    );

    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, id: result.rows[0].id }),
    };

  } catch (error) {
    // ✅ Error detallado para debug
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        error: "Error interno del servidor",
        detalle: error.message,  // ← muestra el error real
        stack: error.stack
      }),
    };
  }
};