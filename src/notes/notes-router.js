const path = require('path')
const express = require('express')
const xss = require('xss')
const NotesService = require('./notes-service')
const { response } = require('../app')

const notesRouter = express.Router()
const jsonParser = express.json()

const serializeNote = note => ({
    id: note.id,
    name: xss(note.name),
    content: xss(note.content),
    folder_id: note.folder_id,
    date_modified: note.date_modified
  })

notesRouter
  .route('/')
  .get((req, res, next) => {
    NotesService.getAllNotes(
      req.app.get('db')
    )
      .then(notes => {
        res.json(notes.map(serializeNote))
      })
      .catch(next)
  })
  .post(jsonParser, (req, res, next) => {
    const { name, content, folder_id } = req.body
    const newNote = { name, content, folder_id }

    for (const [key, value] of Object.entries(newNote)) {
        if (value == null) {
            return res.status(400).json({
                error: { message: `Missing '${key}' in request body`}
            })
        } else {
            newNote[key] = xss(value)
        }
    }

    NotesService.insertNote(
      req.app.get('db'),
      newNote
    )
      .then(note => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${note.id}`))
          .json(note)
      })
      .catch(next)
  })

notesRouter
  .route('/:note_id')
  .all((req, res, next) => {
      NotesService.getById(
          req.app.get('db'),
          req.params.note_id
      )
      .then(note => {
          if (!note) {
              return res.status(404).json({
                  error: { message: `Note doesn't exist`}
              })
          }
          res.note = note
          next()
      })
      .catch(next)
  })
  .get((req, res, next) => {
        res.json({
            id: res.note.id,
            name: xss(res.note.name),
            content: xss(res.note.content),
            folder_id: res.note.folder_id,
            date_modified: res.note.date_modified
        })
    })
  .delete((req,res,next) => {
      NotesService.deleteNote(
          req.app.get('db'),
          req.params.note_id
      )
      .then(() => {
          res.status(204).end()
      })
      .catch(next)
  })
  .patch(jsonParser, (req, res, next) => {
      const { name, content, folder_id } = req.body
      const noteToUpdate = { name, content, folder_id }
      
      const numberOfValues = Object.values(noteToUpdate).filter(Boolean).length 
      if (numberOfValues === 0) {
          return res.status(400).json({
              error: {
                  message: `Request body must contain at least one of 'name', 'content', or 'folder_id'`
              }
          })
      }
      NotesService.updateNote(
          req.app.get('db'),
          req.params.note_id,
          noteToUpdate
      )
      .then(numRowsAffected => {
          res.status(204).end()
      })
      .catch(next)
  })

module.exports = notesRouter