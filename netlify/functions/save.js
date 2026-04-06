const { Pool } = require("pg");

const pool = new Pool({
  connectionString: "postgresql://AGV:TtfvlRibHh93@ep-round-tree-a551uewg-pooler.us-east-2.aws.neon.tech/practica_cpi?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false }, // requerido en Neon/Supabase
});

exports.handler = async (event) => {
  // Solo aceptar POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const data = JSON.parse(event.body);

    // Validación de campos requeridos
    const camposRequeridos = [
      "codigo_sap",
      "identificador_fiscal",
      "Nombre",
      "Telefono",
      "Direccion",
      "Pais",
    ];
    
    const camposFaltantes = camposRequeridos.filter((campo) => !data[campo]);
    
    if (camposFaltantes.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Faltan campos requeridos",
          campos_faltantes: camposFaltantes,
        }),
      };
    }

    // Insertar en PostgreSQL
    const result = await pool.query(
      "INSERT INTO clientes (codigo_sap, identificador_fiscal, nombre, telefono, direccion, pais, creado_en) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id",
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
      body: JSON.stringify({
        success: true,
        id: result.rows[0].id,
      }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error interno del servidor" }),
    };
  }
};