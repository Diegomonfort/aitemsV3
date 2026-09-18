// Datos de países, estados/departamentos y ciudades principales
export const locationData = {
  Uruguay: {
    states: {
      'Montevideo': ['Montevideo'],
      'Canelones': ['Canelones', 'Las Piedras', 'Pando', 'Santa Lucía', 'Atlántida', 'Parque del Plata', 'Ciudad de la Costa'],
      'Maldonado': ['Maldonado', 'Punta del Este', 'San Carlos', 'Piriápolis'],
      'Colonia': ['Colonia del Sacramento', 'Juan Lacaze', 'Rosario', 'Nueva Helvecia', 'Carmelo'],
      'Salto': ['Salto', 'Constitución'],
      'Paysandú': ['Paysandú', 'Guichón'],
      'Rivera': ['Rivera', 'Tranqueras'],
      'Tacuarembó': ['Tacuarembó', 'San Gregorio de Polanco', 'Paso de los Toros'],
      'Artigas': ['Artigas', 'Bella Unión'],
      'Cerro Largo': ['Melo', 'Río Branco'],
      'Durazno': ['Durazno', 'Sarandí del Yí'],
      'Flores': ['Trinidad'],
      'Florida': ['Florida', 'Sarandí Grande'],
      'Lavalleja': ['Minas', 'José Pedro Varela'],
      'Río Negro': ['Fray Bentos', 'Young'],
      'Rocha': ['Rocha', 'Chuy', 'Castillos', 'La Paloma'],
      'San José': ['San José de Mayo', 'Ciudad del Plata', 'Libertad'],
      'Soriano': ['Mercedes', 'Dolores', 'Cardona'],
      'Treinta y Tres': ['Treinta y Tres', 'Vergara']
    }
  },

  Argentina: {
    states: {
      'Ciudad Autónoma de Buenos Aires': ['Palermo', 'Recoleta', 'Belgrano', 'Puerto Madero', 'Caballito', 'Almagro', 'San Telmo', 'Núñez'],
      'Buenos Aires': ['La Plata', 'Mar del Plata', 'Bahía Blanca', 'Tigre', 'San Isidro', 'Vicente López', 'Quilmes', 'Pilar', 'Tandil'],
      'Córdoba': ['Córdoba Capital', 'Villa Carlos Paz', 'Río Cuarto', 'Villa María', 'Alta Gracia', 'San Francisco'],
      'Santa Fe': ['Rosario', 'Santa Fe Capital', 'Rafaela', 'Venado Tuerto', 'Reconquista'],
      'Mendoza': ['Mendoza Capital', 'Godoy Cruz', 'Guaymallén', 'Las Heras', 'San Rafael', 'Luján de Cuyo'],
      'Tucumán': ['San Miguel de Tucumán', 'Yerba Buena', 'Tafí Viejo', 'Concepción'],
      'Entre Ríos': ['Paraná', 'Concordia', 'Gualeguaychú', 'Colón'],
      'Salta': ['Salta Capital', 'San Ramón de la Nueva Orán', 'Tartagal', 'Cafayate'],
      'Misiones': ['Posadas', 'Puerto Iguazú', 'Oberá', 'Eldorado'],
      'Neuquén': ['Neuquén Capital', 'San Martín de los Andes', 'Villa La Angostura', 'Cutral Có'],
      'Río Negro': ['San Carlos de Bariloche', 'General Roca', 'Cipolletti', 'Viedma'],
      'San Juan': ['San Juan Capital', 'Rawson', 'Rivadavia', 'Chimbas'],
      'San Luis': ['San Luis Capital', 'Villa Mercedes', 'Merlo'],
      'Chaco': ['Resistencia', 'Presidencia Roque Sáenz Peña'],
      'Corrientes': ['Corrientes Capital', 'Goya', 'Paso de los Libres'],
      'Chubut': ['Comodoro Rivadavia', 'Trelew', 'Puerto Madryn', 'Esquel'],
      'Jujuy': ['San Salvador de Jujuy', 'Palpalá', 'San Pedro'],
      'La Pampa': ['Santa Rosa', 'General Pico'],
      'La Rioja': ['La Rioja Capital', 'Chilecito'],
      'Santa Cruz': ['Río Gallegos', 'Caleta Olivia', 'El Calafate'],
      'Santiago del Estero': ['Santiago del Estero Capital', 'La Banda'],
      'Tierra del Fuego': ['Ushuaia', 'Río Grande'],
      'Catamarca': ['San Fernando del Valle de Catamarca', 'Andalgalá'],
      'Formosa': ['Formosa Capital', 'Clorinda']
    }
  },

  Chile: {
    states: {
      'Región Metropolitana': ['Santiago', 'Las Condes', 'Providencia', 'Vitacura', 'Lo Barnechea', 'Ñuñoa', 'La Florida', 'Maipú'],
      'Valparaíso': ['Valparaíso', 'Viña del Mar', 'Concón', 'Quilpué', 'Villa Alemana', 'San Antonio'],
      'Biobío': ['Concepción', 'San Pedro de la Paz', 'Talcahuano', 'Chiguayante', 'Los Ángeles'],
      'Araucanía': ['Temuco', 'Villarrica', 'Pucón', 'Angol'],
      'Los Lagos': ['Puerto Varas', 'Puerto Montt', 'Osorno', 'Castro'],
      'Coquimbo': ['La Serena', 'Coquimbo', 'Ovalle'],
      'Antofagasta': ['Antofagasta', 'Calama', 'San Pedro de Atacama']
    }
  },

  Brasil: {
    states: {
      'São Paulo': ['São Paulo', 'Campinas', 'Santos', 'Ribeirão Preto', 'São José dos Campos'],
      'Rio de Janeiro': ['Rio de Janeiro', 'Niterói', 'Petrópolis', 'Búzios', 'Cabo Frio'],
      'Santa Catarina': ['Florianópolis', 'Balneário Camboriú', 'Joinville', 'Blumenau', 'Itajaí'],
      'Rio Grande do Sul': ['Porto Alegre', 'Gramado', 'Canela', 'Caxias do Sul', 'Pelotas'],
      'Paraná': ['Curitiba', 'Londrina', 'Maringá', 'Foz do Iguaçu']
    }
  },

  Paraguay: {
    states: {
      'Asunción': ['Asunción'],
      'Central': ['Luque', 'San Lorenzo', 'Lambaré', 'Fernando de la Mora', 'Capiatá'],
      'Alto Paraná': ['Ciudad del Este', 'Hernandarias', 'Presidente Franco'],
      'Itapúa': ['Encarnación', 'Cambyretá']
    }
  },

  México: {
    states: {
      'Ciudad de México': ['Benito Juárez', 'Miguel Hidalgo', 'Cuauhtémoc', 'Coyoacán', 'Tlalpan', 'Álvaro Obregón'],
      'Nuevo León': ['Monterrey', 'San Pedro Garza García', 'San Nicolás de los Garza', 'Guadalupe'],
      'Jalisco': ['Guadalajara', 'Zapopan', 'Tlaquepaque', 'Puerto Vallarta'],
      'Quintana Roo': ['Cancún', 'Playa del Carmen', 'Tulum', 'Cozumel'],
      'Yucatán': ['Mérida', 'Progreso', 'Valladolid'],
      'Puebla': ['Puebla', 'San Andrés Cholula', 'San Pedro Cholula'],
      'Querétaro': ['Santiago de Querétaro', 'San Juan del Río', 'Corregidora']
    }
  },

  Colombia: {
    states: {
      'Bogotá D.C.': ['Bogotá', 'Usaquén', 'Chapinero', 'Suba', 'Teusaquillo'],
      'Antioquia': ['Medellín', 'Envigado', 'El Poblado', 'Itagüí', 'Rionegro', 'Sabaneta'],
      'Valle del Cauca': ['Cali', 'Palmira', 'Yumbo', 'Jamundí'],
      'Atlántico': ['Barranquilla', 'Puerto Colombia', 'Soledad'],
      'Bolívar': ['Cartagena', 'Turbaco'],
      'Santander': ['Bucaramanga', 'Floridablanca', 'Piedecuesta']
    }
  }
};

export const getCountries = () => {
  return Object.keys(locationData);
};

export const getStates = (country) => {
  if (!country || !locationData[country]) return [];
  return Object.keys(locationData[country].states);
};

export const getCities = (country, state) => {
  if (!country || !state || !locationData[country] || !locationData[country].states[state]) return [];
  return locationData[country].states[state];
};
