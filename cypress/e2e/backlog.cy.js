describe('Gerenciamento do backlog', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/')
  })
  it('Add a new game to the backlog', () => {
    cy.get('#tabBacklog').click()
    cy.get('#addGameBtn').click()
    cy.get('#gameTitle').type('Fallout New Vegas')
    cy.get('#saveBtn').click()

    // assert: verificar se o jogo foi adicionado com o título correto
    cy.get('.cover-overlay').should('contain.text', 'Fallout New Vegas')
  })

  it('Move a game from backlog to playing', () => {
    // add a new game
    cy.get('#tabBacklog').click()
    cy.get('#addGameBtn').click()
    cy.get('#gameTitle').type('Fallout New Vegas')
    cy.get('#saveBtn').click()

    // open the edit modal
    cy.get('.cover-overlay')
    cy.contains('button', 'edit').click()

    // alterar o status no modo edit
    cy.get('#gameStatus').select('Playing')
    cy.get('#saveBtn').click()

    // assert
    cy.get('#tabPlaying').click()
    cy.get('#tabPlaying').should('have.class', 'tab-active')
    cy.get('.cover-overlay')
    cy.get('#playingList').contains('button', 'edit').click()
    cy.get('#gameStatus').should('have.value', 'Playing')
  })
  it('Rate a game with 4 stars', () => {
    // action add game
    cy.get('#tabBacklog').click()
    cy.get('#addGameBtn').click()
    cy.get('#gameTitle').type('Fallout New Vegas')
    cy.get('#ratingStars [data-val="4"]').click()
    cy.get('#saveBtn').click()

    // assert
    cy.get('.cover-overlay')
    cy.contains('button', 'edit').click()
    cy.get('#ratingStars [data-val="4"]').should('have.class', 'active')   
  })
  it('Delete a game', () => {
    // action add game
    cy.get('#tabBacklog').click()
    cy.get('#addGameBtn').click()
    cy.get('#gameTitle').type('Fallout New Vegas')
    cy.get('#saveBtn').click()
    
    // open the edit modal
    cy.get('.cover-overlay')
    cy.contains('button', 'edit').click()
    cy.contains('button', 'Delete').click()

    // assert
    cy.get('#confirmDelete').should('contain.text', 'Are you sure?')
    cy.get('#confirmDeleteBtn').should('be.visible').click()
  })
  it('Search for a game in any section', () => {
    // action add game
    cy.get('#tabBacklog').click()
    cy.get('#addGameBtn').click()
    cy.get('#gameTitle').type('Fallout New Vegas')
    cy.get('#saveBtn').click()

    cy.get('#tabBacklog').click()
    cy.get('#addGameBtn').click()
    cy.get('#gameTitle').type('The Last of Us Part I')
    cy.get('#saveBtn').click()

    // assert
    cy.get('#searchInput').type('The Last of Us Part I')
    // verify if the searched game is visible
    cy.get('.cover-overlay').should('contain.text', 'The Last of Us Part I')
    // verify if other games are not visible
    cy.get('.cover-overlay').should('not.contain.text', 'Fallout New Vegas')    
  })
})
