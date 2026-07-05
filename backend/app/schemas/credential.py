from marshmallow import Schema, fields, validate


class SaveCredentialSchema(Schema):
  provider = fields.Str(required=True, validate=validate.OneOf(["openai", "anthropic", "google"]))
  api_key = fields.Str(required=True, validate=validate.Length(min=10, max=512))
