import mysql from 'mysql2/promise'

const DEFAULT_CONFIG = {
  host: 'localhost',
  user: 'matiasfong',
  port: 3306,
  password: '1234',
  database: 'moviesdb'
}

const connectionString = process.env.DATABASE_URL ?? DEFAULT_CONFIG

const connection = await mysql.createConnection(connectionString)

export class MovieModel {
  static async getAll ({ genre }) {
    if (genre) {
      const loweCaseGenre = genre.toLowerCase()

      // get genre ids from database table using genre names
      const [genres] = await connection.query(
        'SELECT id, name FROM genre WHERE LOWER(name) = ?;', [loweCaseGenre]
      )

      // no genre found
      if (genres.length === 0) return []

      // get the id from the firts genre result
      const [{ id }] = genres

      // get all movies ids from database table
      // la query a movie_genres
      // join
      // y devolver resultados
      const [result] = await connection.query(
        'select bin_to_uuid(a.id) id, a.title, a.year, a.director, a.duration, a.poster, a.rate, c.name ' +
        'from movie a ' +
        'inner join movie_genres b on a.id = b.movie_id ' +
        'inner join genre c on b.genre_id = c.id ' +
        'where c.id = ?;', [id]
      )
      return result
    }
    const [movies] = await connection.query(
      'select bin_to_uuid(id) id, title, year, director, duration, poster, rate from movie;'
    )

    return movies
  }

  static async getById ({ id }) {
    const [movies] = await connection.query(
      `select bin_to_uuid(id) id, title, year, director, duration, poster, rate 
      from movie where id = uuid_to_bin(?);`, [id]
    )

    if (movies.length === 0) return null

    return movies[0]
  }

  static async create ({ input }) {
    const { genre: genreInput, title, year, duration, director, rate, poster } = input

    const [uuidResult] = await connection.query('SELECT UUID() uuid')
    const [{ uuid }] = uuidResult

    // insert movie
    try {
      await connection.query(
      `insert into movie (id, title, year, director, duration, poster, rate) 
      values (uuid_to_bin("${uuid}"), ?, ?, ?, ?, ?, ?);`,
      [title, year, director, duration, poster, rate]
      )
    } catch (e) {
      // puede enviarle informacion sensible
      throw new Error('Error creating movie')
      // enviar la traza a un servicio interno
      // sendLog(e)
    }

    const [movies] = await connection.query(
      `select title, year, director, duration, poster, rate, bin_to_uuid(id) id
      from movie where id = uuid_to_bin(?);`, [uuid]
    )

    return movies[0]
  }

  static async update ({ id, input }) {
    // Obtener la película actual antes de hacer la actualización
    const [existingMovies] = await connection.query(
      `SELECT title, year, director, duration, poster, rate
      FROM movie WHERE id = uuid_to_bin(?);`, [id]
    )

    if (existingMovies.length === 0) {
      throw new Error('Movie not found')
    }

    const existingMovie = existingMovies[0]

    // Usar los valores proporcionados o mantener los existentes
    const {
      title = existingMovie.title,
      year = existingMovie.year,
      director = existingMovie.director,
      duration = existingMovie.duration,
      poster = existingMovie.poster,
      rate = existingMovie.rate
    } = input

    try {
      await connection.query(
        `UPDATE movie SET title = ?, year = ?, director = ?, duration = ?, poster = ?, rate = ?
        WHERE id = uuid_to_bin(?);`, [title, year, director, duration, poster, rate, id]
      )
    } catch (error) {
      throw new Error('Error editing movie')
    }

    const [movies] = await connection.query(
      `SELECT title, year, director, duration, poster, rate, bin_to_uuid(id) id
      FROM movie WHERE id = uuid_to_bin(?);`, [id]
    )

    return movies[0]
  }

  static async delete ({ id }) {
    const [movies] = await connection.query(
      'delete from movie where id = uuid_to_bin(?);', [id]
    )

    if (movies.length === 0) return null

    return { success: true }
  }
}
