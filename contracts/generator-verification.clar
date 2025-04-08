;; Generator Verification Contract
;; Validates and registers renewable energy sources

(define-data-var admin principal tx-sender)

;; Generator types
(define-constant SOLAR u1)
(define-constant WIND u2)
(define-constant HYDRO u3)
(define-constant GEOTHERMAL u4)

;; Generator status
(define-constant STATUS-PENDING u0)
(define-constant STATUS-VERIFIED u1)
(define-constant STATUS-REJECTED u2)

;; Generator data structure
(define-map generators
  { id: uint }
  {
    owner: principal,
    generator-type: uint,
    location: (string-utf8 100),
    capacity: uint,
    status: uint,
    verification-date: uint
  }
)

;; Counter for generator IDs
(define-data-var generator-id-counter uint u0)

;; Register a new generator
(define-public (register-generator
    (generator-type uint)
    (location (string-utf8 100))
    (capacity uint))
  (let ((new-id (+ (var-get generator-id-counter) u1)))
    (begin
      (var-set generator-id-counter new-id)
      (map-set generators
        { id: new-id }
        {
          owner: tx-sender,
          generator-type: generator-type,
          location: location,
          capacity: capacity,
          status: STATUS-PENDING,
          verification-date: u0
        }
      )
      (ok new-id)
    )
  )
)

;; Verify a generator (admin only)
(define-public (verify-generator (generator-id uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (match (map-get? generators { id: generator-id })
      generator
      (begin
        (map-set generators
          { id: generator-id }
          (merge generator {
            status: STATUS-VERIFIED,
            verification-date: block-height
          })
        )
        (ok true)
      )
      (err u404)
    )
  )
)

;; Reject a generator (admin only)
(define-public (reject-generator (generator-id uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (match (map-get? generators { id: generator-id })
      generator
      (begin
        (map-set generators
          { id: generator-id }
          (merge generator {
            status: STATUS-REJECTED,
            verification-date: block-height
          })
        )
        (ok true)
      )
      (err u404)
    )
  )
)

;; Get generator details
(define-read-only (get-generator (generator-id uint))
  (map-get? generators { id: generator-id })
)

;; Check if generator is verified
(define-read-only (is-generator-verified (generator-id uint))
  (match (map-get? generators { id: generator-id })
    generator (is-eq (get status generator) STATUS-VERIFIED)
    false
  )
)

;; Transfer generator ownership
(define-public (transfer-generator (generator-id uint) (new-owner principal))
  (match (map-get? generators { id: generator-id })
    generator
    (begin
      (asserts! (is-eq (get owner generator) tx-sender) (err u403))
      (map-set generators
        { id: generator-id }
        (merge generator { owner: new-owner })
      )
      (ok true)
    )
    (err u404)
  )
)

;; Set new admin
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (var-set admin new-admin)
    (ok true)
  )
)
