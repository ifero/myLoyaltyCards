import Foundation
import SwiftData

@Model
final class WatchCardEntity: Identifiable {
  @Attribute(.unique) var id: String
  var name: String
  var barcode: String
  var barcodeFormat: String
  var brandId: String?
  var color: String
  var isFavorite: Bool = false
  var lastUsedAt: Date?
  var usageCount: Int = 0
  var createdAt: Date
  var updatedAt: Date
  // Optional serialized original payload for forward compatibility
  var rawPayload: Data?

  init(
    id: String,
    name: String,
    barcode: String,
    barcodeFormat: String,
    brandId: String? = nil,
    color: String,
    isFavorite: Bool = false,
    lastUsedAt: Date? = nil,
    usageCount: Int = 0,
    createdAt: Date = Date(),
    updatedAt: Date = Date(),
    rawPayload: Data? = nil
  ) {
    self.id = id
    self.name = name
    self.barcode = barcode
    self.barcodeFormat = barcodeFormat
    self.brandId = brandId
    self.color = color
    self.isFavorite = isFavorite
    self.lastUsedAt = lastUsedAt
    self.usageCount = usageCount
    self.createdAt = createdAt
    self.updatedAt = updatedAt
    self.rawPayload = rawPayload
  }
}
